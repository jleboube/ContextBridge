const axios = require('axios');

class SummarizationService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    this.defaultProvider = 'openai';
  }

  async summarizeConversation(messages, options = {}) {
    const {
      compressionLevel = 'medium',
      preserveCodeBlocks = true,
      maxSummaryLength = null,
      provider = this.defaultProvider,
      customInstructions = ''
    } = options;

    try {
      const conversationText = this.formatMessagesForSummary(messages, preserveCodeBlocks);
      
      if (!conversationText.trim()) {
        throw new Error('No content to summarize');
      }

      const summary = await this.callSummarizationAPI(
        conversationText, 
        compressionLevel, 
        maxSummaryLength,
        provider,
        customInstructions
      );

      const metadata = {
        originalMessageCount: messages.length,
        originalCharacterCount: conversationText.length,
        summaryCharacterCount: summary.length,
        compressionRatio: (summary.length / conversationText.length).toFixed(2),
        provider,
        compressionLevel,
        summarizedAt: new Date().toISOString()
      };

      return {
        summary,
        metadata,
        success: true
      };

    } catch (error) {
      console.error('Summarization error:', error);
      return {
        summary: null,
        error: error.message,
        success: false
      };
    }
  }

  formatMessagesForSummary(messages, preserveCodeBlocks = true) {
    return messages.map(msg => {
      let content = msg.content;
      
      // Preserve code blocks if requested
      if (preserveCodeBlocks && content.includes('```')) {
        content = content.replace(/```(\w+)?\n([\s\S]*?)```/g, '[CODE_BLOCK:$1]\n$2\n[/CODE_BLOCK]');
      }

      return `**${msg.role.toUpperCase()}**: ${content}`;
    }).join('\n\n');
  }

  async callSummarizationAPI(text, compressionLevel, maxLength, provider, customInstructions) {
    switch (provider.toLowerCase()) {
      case 'openai':
        return await this.summarizeWithOpenAI(text, compressionLevel, maxLength, customInstructions);
      case 'anthropic':
        return await this.summarizeWithAnthropic(text, compressionLevel, maxLength, customInstructions);
      default:
        return await this.summarizeWithOpenAI(text, compressionLevel, maxLength, customInstructions);
    }
  }

  async summarizeWithOpenAI(text, compressionLevel, maxLength, customInstructions) {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const compressionInstructions = this.getCompressionInstructions(compressionLevel);
    const lengthInstruction = maxLength ? `Keep the summary under ${maxLength} characters. ` : '';
    
    const systemPrompt = `You are an expert at summarizing AI conversations. Your task is to create a concise but comprehensive summary that preserves the key information, context, and any important details.

${compressionInstructions}

${lengthInstruction}Important guidelines:
- Preserve technical terms, code snippets (marked with [CODE_BLOCK] tags), and specific details
- Maintain the logical flow of the conversation
- Include key decisions, conclusions, or outcomes
- Note any unresolved questions or next steps
- Use clear, professional language
${customInstructions ? '\n\nAdditional instructions: ' + customInstructions : ''}

Format the output as a well-structured summary with clear sections if appropriate.`;

    try {
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Please summarize this conversation:\n\n${text}` }
        ],
        max_tokens: maxLength ? Math.min(Math.floor(maxLength / 3), 4000) : 2000,
        temperature: 0.1
      }, {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      throw new Error(`OpenAI API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async summarizeWithAnthropic(text, compressionLevel, maxLength, customInstructions) {
    if (!this.anthropicApiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const compressionInstructions = this.getCompressionInstructions(compressionLevel);
    const lengthInstruction = maxLength ? `Keep the summary under ${maxLength} characters. ` : '';

    const prompt = `Please create a comprehensive summary of the following AI conversation. 

${compressionInstructions}

${lengthInstruction}Guidelines:
- Preserve technical details, code snippets, and important specifics
- Maintain conversation flow and context
- Include key insights, decisions, and outcomes
- Note any open questions or action items
- Use professional, clear language
${customInstructions ? '\n\nAdditional instructions: ' + customInstructions : ''}

Conversation to summarize:

${text}

Summary:`;

    try {
      const response = await axios.post('https://api.anthropic.com/v1/messages', {
        model: 'claude-3-sonnet-20240229',
        max_tokens: maxLength ? Math.min(Math.floor(maxLength / 3), 4000) : 2000,
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.1
      }, {
        headers: {
          'x-api-key': this.anthropicApiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        timeout: 30000
      });

      return response.data.content[0].text.trim();
    } catch (error) {
      throw new Error(`Anthropic API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  getCompressionInstructions(level) {
    const instructions = {
      'low': 'Create a detailed summary that captures most of the conversation content with minimal compression. Include specific examples and detailed explanations.',
      'medium': 'Create a balanced summary that captures the essential information while reducing verbosity. Focus on key points, decisions, and outcomes.',
      'high': 'Create a concise summary that captures only the most critical information, main conclusions, and essential context needed for continuation.',
      'ultra': 'Create an ultra-concise summary focusing only on the core outcome, key decisions, and minimal context needed to understand the conversation state.'
    };

    return instructions[level] || instructions['medium'];
  }

  async generateContextHandoff(conversation, targetProvider, options = {}) {
    const {
      includeMetadata = false,
      customPrompt = null,
      preserveConversationFlow = true
    } = options;

    try {
      // Get or generate summary
      let summary = conversation.contextSummary;
      if (!summary && conversation.messages && conversation.messages.length > 0) {
        const summarizationResult = await this.summarizeConversation(conversation.messages, {
          compressionLevel: 'medium',
          provider: targetProvider === 'anthropic' ? 'anthropic' : 'openai'
        });
        
        if (summarizationResult.success) {
          summary = summarizationResult.summary;
        } else {
          throw new Error('Failed to generate summary for handoff');
        }
      }

      // Generate provider-specific handoff
      const handoffContent = this.formatHandoffContent(
        conversation, 
        summary, 
        targetProvider, 
        includeMetadata,
        customPrompt,
        preserveConversationFlow
      );

      return {
        content: handoffContent,
        targetProvider,
        metadata: {
          sourceProvider: conversation.aiProvider,
          originalMessageCount: conversation.messageCount,
          hasCustomPrompt: !!customPrompt,
          generatedAt: new Date().toISOString()
        },
        success: true
      };

    } catch (error) {
      console.error('Context handoff error:', error);
      return {
        content: null,
        error: error.message,
        success: false
      };
    }
  }

  formatHandoffContent(conversation, summary, targetProvider, includeMetadata, customPrompt, preserveFlow) {
    const providerIntros = {
      'openai': 'I need to continue a conversation that was started with another AI assistant. Here\'s the context:',
      'anthropic': 'I\'m continuing a conversation from another AI system. Here\'s what we\'ve discussed so far:',
      'google': 'Continuing a conversation from a previous AI session. Context:',
      'mistral': 'Resuming a conversation from another AI assistant. Previous context:',
      'generic': 'Continuing an AI conversation from another platform. Context:'
    };

    const providerClosings = {
      'openai': 'Please acknowledge this context and continue our conversation naturally.',
      'anthropic': 'I\'ve provided this context so we can continue seamlessly. Please confirm you understand and we can proceed.',
      'google': 'Please review this context and let me know you\'re ready to continue.',
      'mistral': 'Please confirm you understand this background and we can continue.',
      'generic': 'Please acknowledge this context and continue the conversation.'
    };

    let content = customPrompt || providerIntros[targetProvider] || providerIntros['generic'];
    content += '\n\n';

    // Add conversation metadata
    if (includeMetadata) {
      content += `**Original Conversation Details:**\n`;
      content += `- Title: ${conversation.title}\n`;
      content += `- Previous AI: ${conversation.aiProvider}${conversation.modelVersion ? ` (${conversation.modelVersion})` : ''}\n`;
      content += `- Message Count: ${conversation.messageCount}\n`;
      content += `- Created: ${new Date(conversation.createdAt).toLocaleDateString()}\n\n`;
    }

    // Add summary or messages
    if (summary) {
      content += `**Conversation Summary:**\n${summary}\n\n`;
    } else if (preserveFlow && conversation.messages && conversation.messages.length > 0) {
      content += `**Recent Messages:**\n`;
      const recentMessages = conversation.messages.slice(-5); // Last 5 messages
      recentMessages.forEach(msg => {
        content += `**${msg.role.toUpperCase()}:** ${msg.content}\n\n`;
      });
    }

    content += providerClosings[targetProvider] || providerClosings['generic'];

    return content;
  }

  async autoSummarizeIfNeeded(conversation, threshold = 20) {
    if (!conversation.messages || conversation.messages.length < threshold) {
      return null;
    }

    if (conversation.contextSummary) {
      return null; // Already has summary
    }

    try {
      const result = await this.summarizeConversation(conversation.messages, {
        compressionLevel: 'medium',
        provider: this.defaultProvider
      });

      if (result.success) {
        return result;
      }
    } catch (error) {
      console.error('Auto-summarization failed:', error);
    }

    return null;
  }

  // Utility method to estimate token count (approximation)
  estimateTokenCount(text) {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  // Check if conversation needs summarization based on token limits
  needsSummarization(messages, tokenLimit = 8000) {
    const totalText = this.formatMessagesForSummary(messages);
    const estimatedTokens = this.estimateTokenCount(totalText);
    return estimatedTokens > tokenLimit;
  }
}

module.exports = new SummarizationService();