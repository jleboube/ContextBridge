const marked = require('marked');
const TurndownService = require('turndown');
const { format } = require('date-fns');

class ExportService {
  static async exportToJSON(project, conversations) {
    const exportData = {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        tags: project.tags,
        status: project.status,
        createdAt: project.createdAt,
        lastActivityAt: project.lastActivityAt
      },
      conversations: conversations.map(conv => ({
        id: conv.id,
        title: conv.title,
        aiProvider: conv.aiProvider,
        modelVersion: conv.modelVersion,
        messageCount: conv.messageCount,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        messages: conv.messages || []
      })),
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        format: 'json',
        version: '1.0'
      }
    };

    return JSON.stringify(exportData, null, 2);
  }

  static async exportToMarkdown(project, conversations) {
    let markdown = `# ${project.name}\n\n`;
    
    if (project.description) {
      markdown += `${project.description}\n\n`;
    }

    if (project.tags && project.tags.length > 0) {
      markdown += `**Tags:** ${project.tags.join(', ')}\n\n`;
    }

    markdown += `**Created:** ${format(new Date(project.createdAt), 'PPP')}\n`;
    markdown += `**Last Activity:** ${format(new Date(project.lastActivityAt), 'PPP')}\n\n`;

    markdown += `---\n\n`;

    for (const conversation of conversations) {
      markdown += `## ${conversation.title}\n\n`;
      markdown += `**AI Provider:** ${conversation.aiProvider}\n`;
      if (conversation.modelVersion) {
        markdown += `**Model:** ${conversation.modelVersion}\n`;
      }
      markdown += `**Messages:** ${conversation.messageCount}\n`;
      markdown += `**Created:** ${format(new Date(conversation.createdAt), 'PPP')}\n\n`;

      if (conversation.messages && conversation.messages.length > 0) {
        for (const message of conversation.messages) {
          const roleEmoji = this.getRoleEmoji(message.role);
          markdown += `### ${roleEmoji} ${this.capitalizeFirst(message.role)}\n\n`;
          markdown += `${message.content}\n\n`;
          
          if (message.metadata && Object.keys(message.metadata).length > 0) {
            markdown += `<details>\n<summary>Metadata</summary>\n\n\`\`\`json\n${JSON.stringify(message.metadata, null, 2)}\n\`\`\`\n</details>\n\n`;
          }
        }
      }

      markdown += `---\n\n`;
    }

    return markdown;
  }

  static async exportToContextPrompt(project, conversations, options = {}) {
    const { targetProvider = 'generic', compressionLevel = 'medium' } = options;
    
    let prompt = this.getProviderPrefix(targetProvider);
    
    prompt += `# Context from ${project.name}\n\n`;
    
    if (project.description) {
      prompt += `Project Description: ${project.description}\n\n`;
    }

    prompt += `This context contains ${conversations.length} conversation(s) from previous AI interactions:\n\n`;

    for (const conversation of conversations) {
      prompt += `## Conversation: ${conversation.title}\n`;
      prompt += `From: ${conversation.aiProvider}${conversation.modelVersion ? ` (${conversation.modelVersion})` : ''}\n\n`;

      if (conversation.contextSummary && compressionLevel === 'high') {
        // Use existing summary if available
        prompt += `Summary: ${conversation.contextSummary}\n\n`;
      } else if (conversation.messages && conversation.messages.length > 0) {
        // Include messages based on compression level
        const messagesToInclude = this.filterMessagesByCompression(conversation.messages, compressionLevel);
        
        for (const message of messagesToInclude) {
          prompt += `**${this.capitalizeFirst(message.role)}:** ${message.content}\n\n`;
        }
      }

      prompt += `---\n\n`;
    }

    prompt += this.getProviderSuffix(targetProvider);
    
    return prompt;
  }

  static filterMessagesByCompression(messages, level) {
    switch (level) {
      case 'high':
        // Include only key messages (first, last, and every 10th)
        const filtered = [];
        messages.forEach((msg, index) => {
          if (index === 0 || index === messages.length - 1 || index % 10 === 0) {
            filtered.push(msg);
          }
        });
        return filtered;
      
      case 'medium':
        // Include every other message
        return messages.filter((_, index) => index % 2 === 0);
      
      case 'low':
      default:
        // Include all messages
        return messages;
    }
  }

  static getProviderPrefix(provider) {
    const prefixes = {
      openai: "Please continue our conversation using the following context from previous sessions:\n\n",
      anthropic: "Here is the context from our previous conversations. Please use this information to continue our discussion:\n\n",
      google: "Context from previous conversations:\n\n",
      mistral: "Previous conversation context:\n\n",
      generic: "Here is the context from previous AI conversations:\n\n"
    };
    
    return prefixes[provider] || prefixes.generic;
  }

  static getProviderSuffix(provider) {
    const suffixes = {
      openai: "\n\nPlease acknowledge that you've reviewed this context and are ready to continue our conversation.",
      anthropic: "\n\nI've provided this context so we can continue our discussion seamlessly. Please let me know you understand the background.",
      google: "\n\nPlease confirm you understand this context before we proceed.",
      mistral: "\n\nPlease acknowledge the context and let's continue.",
      generic: "\n\nPlease acknowledge this context and continue our conversation."
    };
    
    return suffixes[provider] || suffixes.generic;
  }

  static getRoleEmoji(role) {
    const emojis = {
      user: '👤',
      assistant: '🤖',
      system: '⚙️'
    };
    
    return emojis[role] || '💬';
  }

  static capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  static calculateExportSize(content) {
    return Buffer.byteLength(content, 'utf8');
  }
}

module.exports = ExportService;