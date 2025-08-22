const db = require('../database/connection');

class Conversation {
  static async create({ projectId, title, aiProvider, modelVersion = null }) {
    const [conversation] = await db('conversations')
      .insert({
        project_id: projectId,
        title,
        ai_provider: aiProvider,
        model_version: modelVersion
      })
      .returning('*');
    
    return this.format(conversation);
  }

  static async findById(id) {
    const conversation = await db('conversations')
      .where({ id })
      .first();
    
    return conversation ? this.format(conversation) : null;
  }

  static async findByProject(projectId, { status = null, limit = 50, offset = 0 } = {}) {
    let query = db('conversations')
      .where({ project_id: projectId })
      .orderBy('updated_at', 'desc')
      .limit(limit)
      .offset(offset);

    if (status) {
      query = query.where({ status });
    }

    const conversations = await query;
    return conversations.map(conversation => this.format(conversation));
  }

  static async update(id, updates) {
    const allowedFields = ['title', 'context_summary', 'status'];
    const filteredUpdates = {};
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    if (Object.keys(filteredUpdates).length === 0) return null;

    const [conversation] = await db('conversations')
      .where({ id })
      .update(filteredUpdates)
      .returning('*');
    
    return conversation ? this.format(conversation) : null;
  }

  static async delete(id) {
    const deleted = await db('conversations')
      .where({ id })
      .del();
    
    return deleted > 0;
  }

  static async incrementMessageCount(id) {
    await db('conversations')
      .where({ id })
      .increment('message_count', 1)
      .update({ updated_at: db.fn.now() });
  }

  static async getWithMessages(id) {
    const conversation = await this.findById(id);
    if (!conversation) return null;

    const messages = await db('messages')
      .where({ conversation_id: id })
      .orderBy('sequence_order', 'asc');

    return {
      ...conversation,
      messages: messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        rawContent: msg.raw_content,
        metadata: typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata,
        sequenceOrder: msg.sequence_order,
        tokenCount: msg.token_count,
        createdAt: msg.created_at
      }))
    };
  }

  static format(conversation) {
    if (!conversation) return null;
    
    return {
      id: conversation.id,
      projectId: conversation.project_id,
      title: conversation.title,
      aiProvider: conversation.ai_provider,
      modelVersion: conversation.model_version,
      contextSummary: conversation.context_summary,
      messageCount: conversation.message_count,
      status: conversation.status,
      createdAt: conversation.created_at,
      updatedAt: conversation.updated_at
    };
  }
}

module.exports = Conversation;