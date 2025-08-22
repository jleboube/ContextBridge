const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Project = require('../models/Project');
const summarizationService = require('../services/summarizationService');
const { authenticateToken } = require('../middleware/auth');
const { generalRateLimit } = require('../middleware/rateLimiter');
const Joi = require('joi');

// Apply authentication and rate limiting to all routes
router.use(authenticateToken);
router.use(generalRateLimit);

// Validation schemas
const summarizeSchema = Joi.object({
  conversationId: Joi.string().uuid().required(),
  compressionLevel: Joi.string().valid('low', 'medium', 'high', 'ultra').default('medium'),
  maxSummaryLength: Joi.number().integer().min(100).max(10000).optional(),
  provider: Joi.string().valid('openai', 'anthropic').default('openai'),
  customInstructions: Joi.string().max(500).allow('').optional(),
  preserveCodeBlocks: Joi.boolean().default(true)
});

const handoffSchema = Joi.object({
  conversationId: Joi.string().uuid().required(),
  targetProvider: Joi.string().valid('openai', 'anthropic', 'google', 'mistral', 'generic').required(),
  includeMetadata: Joi.boolean().default(false),
  customPrompt: Joi.string().max(1000).allow('').optional(),
  preserveConversationFlow: Joi.boolean().default(true),
  generateNewSummary: Joi.boolean().default(false)
});

// Generate summary for a conversation
router.post('/summarize', async (req, res) => {
  try {
    const { error, value } = summarizeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.details[0].message 
      });
    }

    const { 
      conversationId, 
      compressionLevel, 
      maxSummaryLength, 
      provider, 
      customInstructions,
      preserveCodeBlocks 
    } = value;

    // Get conversation with messages and verify ownership
    const conversation = await Conversation.getWithMessages(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const project = await Project.findById(conversation.projectId);
    if (!project || project.userId !== req.user.id) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (!conversation.messages || conversation.messages.length === 0) {
      return res.status(400).json({ error: 'No messages to summarize' });
    }

    // Generate summary
    const result = await summarizationService.summarizeConversation(conversation.messages, {
      compressionLevel,
      maxSummaryLength,
      provider,
      customInstructions,
      preserveCodeBlocks
    });

    if (!result.success) {
      return res.status(500).json({ 
        error: 'Summarization failed', 
        details: result.error 
      });
    }

    // Update conversation with summary
    await Conversation.update(conversationId, {
      contextSummary: result.summary
    });

    res.json({
      message: 'Summary generated successfully',
      summary: result.summary,
      metadata: result.metadata
    });

  } catch (error) {
    console.error('Summarize endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate context handoff for provider switching
router.post('/handoff', async (req, res) => {
  try {
    const { error, value } = handoffSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.details[0].message 
      });
    }

    const { 
      conversationId, 
      targetProvider, 
      includeMetadata, 
      customPrompt,
      preserveConversationFlow,
      generateNewSummary 
    } = value;

    // Get conversation and verify ownership
    const conversation = await Conversation.getWithMessages(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const project = await Project.findById(conversation.projectId);
    if (!project || project.userId !== req.user.id) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Generate new summary if requested or if none exists
    if (generateNewSummary || !conversation.contextSummary) {
      if (conversation.messages && conversation.messages.length > 0) {
        const summaryResult = await summarizationService.summarizeConversation(conversation.messages, {
          compressionLevel: 'medium',
          provider: targetProvider === 'anthropic' ? 'anthropic' : 'openai'
        });

        if (summaryResult.success) {
          conversation.contextSummary = summaryResult.summary;
          // Update the conversation in database
          await Conversation.update(conversationId, {
            contextSummary: summaryResult.summary
          });
        }
      }
    }

    // Generate handoff content
    const handoffResult = await summarizationService.generateContextHandoff(conversation, targetProvider, {
      includeMetadata,
      customPrompt,
      preserveConversationFlow
    });

    if (!handoffResult.success) {
      return res.status(500).json({ 
        error: 'Handoff generation failed', 
        details: handoffResult.error 
      });
    }

    res.json({
      message: 'Context handoff generated successfully',
      handoffContent: handoffResult.content,
      targetProvider: handoffResult.targetProvider,
      metadata: handoffResult.metadata,
      instructions: {
        copyPaste: 'Copy the handoff content and paste it into your conversation with the target AI provider.',
        recommended: `This content is optimized for ${targetProvider === 'generic' ? 'general use' : targetProvider}.`
      }
    });

  } catch (error) {
    console.error('Handoff endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Auto-summarize conversation if it exceeds threshold
router.post('/auto-summarize/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { threshold = 20, provider = 'openai' } = req.body;

    // Get conversation and verify ownership
    const conversation = await Conversation.getWithMessages(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const project = await Project.findById(conversation.projectId);
    if (!project || project.userId !== req.user.id) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Check if auto-summarization is needed
    const result = await summarizationService.autoSummarizeIfNeeded(conversation, threshold);
    
    if (!result) {
      return res.json({
        message: 'No summarization needed',
        reason: conversation.contextSummary ? 'Already has summary' : 'Below threshold',
        threshold,
        messageCount: conversation.messageCount
      });
    }

    if (!result.success) {
      return res.status(500).json({ 
        error: 'Auto-summarization failed', 
        details: result.error 
      });
    }

    // Update conversation with summary
    await Conversation.update(conversationId, {
      contextSummary: result.summary
    });

    res.json({
      message: 'Conversation auto-summarized successfully',
      summary: result.summary,
      metadata: result.metadata,
      wasTriggered: true
    });

  } catch (error) {
    console.error('Auto-summarize endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get summarization status and recommendations
router.get('/status/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;

    // Get conversation and verify ownership
    const conversation = await Conversation.getWithMessages(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const project = await Project.findById(conversation.projectId);
    if (!project || project.userId !== req.user.id) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const status = {
      conversationId,
      hasExistingSummary: !!conversation.contextSummary,
      messageCount: conversation.messageCount,
      recommendations: []
    };

    // Add recommendations based on conversation state
    if (!conversation.contextSummary && conversation.messageCount > 10) {
      status.recommendations.push({
        type: 'summarize',
        priority: 'medium',
        reason: 'Conversation is getting lengthy, summarization recommended'
      });
    }

    if (conversation.messages && conversation.messages.length > 0) {
      const needsSummarization = summarizationService.needsSummarization(conversation.messages);
      const estimatedTokens = summarizationService.estimateTokenCount(
        summarizationService.formatMessagesForSummary(conversation.messages)
      );

      status.estimatedTokens = estimatedTokens;
      status.needsSummarization = needsSummarization;

      if (needsSummarization) {
        status.recommendations.push({
          type: 'summarize',
          priority: 'high',
          reason: 'Approaching token limits, summarization strongly recommended'
        });
      }
    }

    if (conversation.contextSummary) {
      const summaryAge = Date.now() - new Date(conversation.updatedAt).getTime();
      const daysSinceUpdate = summaryAge / (1000 * 60 * 60 * 24);

      if (daysSinceUpdate > 7 && conversation.messageCount > 15) {
        status.recommendations.push({
          type: 'refresh_summary',
          priority: 'low',
          reason: 'Summary may be outdated based on recent activity'
        });
      }
    }

    res.json(status);

  } catch (error) {
    console.error('Status endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Batch summarize multiple conversations in a project
router.post('/batch-summarize', async (req, res) => {
  try {
    const { projectId, provider = 'openai', compressionLevel = 'medium' } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    // Verify project ownership
    const project = await Project.findById(projectId);
    if (!project || project.userId !== req.user.id) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get all conversations in the project without summaries
    const conversations = await db('conversations')
      .where({ project_id: projectId, status: 'active' })
      .whereNull('context_summary')
      .select('id');

    if (conversations.length === 0) {
      return res.json({
        message: 'No conversations need summarization',
        processedCount: 0
      });
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const conv of conversations) {
      try {
        const conversation = await Conversation.getWithMessages(conv.id);
        if (conversation.messages && conversation.messages.length >= 5) {
          const result = await summarizationService.summarizeConversation(conversation.messages, {
            compressionLevel,
            provider
          });

          if (result.success) {
            await Conversation.update(conv.id, {
              contextSummary: result.summary
            });
            successCount++;
          } else {
            errorCount++;
          }

          results.push({
            conversationId: conv.id,
            success: result.success,
            error: result.error || null
          });
        }
      } catch (error) {
        errorCount++;
        results.push({
          conversationId: conv.id,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      message: 'Batch summarization completed',
      totalConversations: conversations.length,
      successCount,
      errorCount,
      results
    });

  } catch (error) {
    console.error('Batch summarize endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;