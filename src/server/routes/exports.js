const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Conversation = require('../models/Conversation');
const ExportService = require('../services/exportService');
const db = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');
const { generalRateLimit } = require('../middleware/rateLimiter');

// Apply authentication to all routes
router.use(authenticateToken);

// Export project in various formats
router.post('/project/:projectId', generalRateLimit, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { format = 'json', targetProvider = 'generic', compressionLevel = 'medium', includeMetadata = true } = req.body;

    // Verify project belongs to user
    const project = await Project.findById(projectId);
    if (!project || project.userId !== req.user.id) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get all conversations with messages for this project
    const conversations = await db('conversations')
      .where({ project_id: projectId, status: 'active' })
      .orderBy('created_at', 'asc');

    const conversationsWithMessages = await Promise.all(
      conversations.map(async (conv) => {
        const messages = await db('messages')
          .where({ conversation_id: conv.id })
          .orderBy('sequence_order', 'asc')
          .select('*');

        return {
          ...Conversation.format(conv),
          messages: messages.map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            rawContent: msg.raw_content,
            metadata: includeMetadata ? (typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata) : {},
            sequenceOrder: msg.sequence_order,
            createdAt: msg.created_at
          }))
        };
      })
    );

    let exportContent;
    let contentType = 'application/json';
    let filename = `${project.name.replace(/[^a-z0-9]/gi, '_')}_export`;

    switch (format.toLowerCase()) {
      case 'json':
        exportContent = await ExportService.exportToJSON(project, conversationsWithMessages);
        filename += '.json';
        break;

      case 'markdown':
        exportContent = await ExportService.exportToMarkdown(project, conversationsWithMessages);
        contentType = 'text/markdown';
        filename += '.md';
        break;

      case 'context_prompt':
        exportContent = await ExportService.exportToContextPrompt(project, conversationsWithMessages, {
          targetProvider,
          compressionLevel
        });
        contentType = 'text/plain';
        filename += '_context.txt';
        break;

      default:
        return res.status(400).json({ error: 'Unsupported export format. Use: json, markdown, context_prompt' });
    }

    // Store export record
    const exportRecord = await db('exports')
      .insert({
        project_id: projectId,
        user_id: req.user.id,
        format: format.toLowerCase(),
        target_provider: targetProvider,
        exported_content: exportContent.length > 50000 ? exportContent.substring(0, 50000) + '...[truncated]' : exportContent,
        export_options: JSON.stringify({
          compressionLevel,
          includeMetadata,
          conversationCount: conversationsWithMessages.length
        }),
        file_size_bytes: ExportService.calculateExportSize(exportContent)
      })
      .returning('*');

    // Return the export
    if (req.query.download === 'true') {
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(exportContent);
    } else {
      res.json({
        message: 'Export completed successfully',
        export: {
          id: exportRecord[0].id,
          format: format.toLowerCase(),
          filename,
          size: ExportService.calculateExportSize(exportContent),
          conversationCount: conversationsWithMessages.length,
          messageCount: conversationsWithMessages.reduce((total, conv) => total + conv.messages.length, 0),
          createdAt: exportRecord[0].created_at
        },
        content: exportContent
      });
    }

  } catch (error) {
    console.error('Export project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get export history for user
router.get('/history', generalRateLimit, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const exports = await db('exports')
      .join('projects', 'exports.project_id', 'projects.id')
      .where('exports.user_id', req.user.id)
      .select(
        'exports.id',
        'exports.format',
        'exports.target_provider',
        'exports.file_size_bytes',
        'exports.export_options',
        'exports.created_at',
        'projects.name as project_name'
      )
      .orderBy('exports.created_at', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    const formattedExports = exports.map(exp => ({
      id: exp.id,
      projectName: exp.project_name,
      format: exp.format,
      targetProvider: exp.target_provider,
      fileSizeBytes: exp.file_size_bytes,
      options: typeof exp.export_options === 'string' ? JSON.parse(exp.export_options) : exp.export_options,
      createdAt: exp.created_at
    }));

    res.json({ exports: formattedExports });
  } catch (error) {
    console.error('Get export history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific export by ID
router.get('/:id', generalRateLimit, async (req, res) => {
  try {
    const exportRecord = await db('exports')
      .join('projects', 'exports.project_id', 'projects.id')
      .where('exports.id', req.params.id)
      .where('exports.user_id', req.user.id)
      .select('exports.*', 'projects.name as project_name')
      .first();

    if (!exportRecord) {
      return res.status(404).json({ error: 'Export not found' });
    }

    res.json({
      export: {
        id: exportRecord.id,
        projectName: exportRecord.project_name,
        format: exportRecord.format,
        targetProvider: exportRecord.target_provider,
        content: exportRecord.exported_content,
        fileSizeBytes: exportRecord.file_size_bytes,
        options: typeof exportRecord.export_options === 'string' ? JSON.parse(exportRecord.export_options) : exportRecord.export_options,
        createdAt: exportRecord.created_at
      }
    });
  } catch (error) {
    console.error('Get export error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;