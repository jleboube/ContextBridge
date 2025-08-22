const db = require('../database/connection');

class Message {
  static async create({ conversationId, role, content, rawContent = null, metadata = {}, sequenceOrder }) {
    const [message] = await db('messages')
      .insert({
        conversation_id: conversationId,
        role,
        content,
        raw_content: rawContent,
        metadata: JSON.stringify(metadata),
        sequence_order: sequenceOrder
      })
      .returning('*');
    
    return this.format(message);
  }

  static async createBatch(messages) {
    const formattedMessages = messages.map(msg => ({
      conversation_id: msg.conversationId,
      role: msg.role,
      content: msg.content,
      raw_content: msg.rawContent || null,
      metadata: JSON.stringify(msg.metadata || {}),
      sequence_order: msg.sequenceOrder
    }));

    const insertedMessages = await db('messages')
      .insert(formattedMessages)
      .returning('*');
    
    return insertedMessages.map(message => this.format(message));
  }

  static async findByConversation(conversationId, { limit = 100, offset = 0 } = {}) {
    const messages = await db('messages')
      .where({ conversation_id: conversationId })
      .orderBy('sequence_order', 'asc')
      .limit(limit)
      .offset(offset);

    return messages.map(message => this.format(message));
  }

  static async getNextSequenceOrder(conversationId) {
    const result = await db('messages')
      .where({ conversation_id: conversationId })
      .max('sequence_order as maxOrder')
      .first();
    
    return (result.maxOrder || 0) + 1;
  }

  static async update(id, updates) {
    const allowedFields = ['content', 'metadata'];
    const filteredUpdates = {};
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        if (key === 'metadata') {
          filteredUpdates[key] = JSON.stringify(updates[key]);
        } else {
          filteredUpdates[key] = updates[key];
        }
      }
    });

    if (Object.keys(filteredUpdates).length === 0) return null;

    const [message] = await db('messages')
      .where({ id })
      .update(filteredUpdates)
      .returning('*');
    
    return message ? this.format(message) : null;
  }

  static async delete(id) {
    const deleted = await db('messages')
      .where({ id })
      .del();
    
    return deleted > 0;
  }

  static async getConversationStats(conversationId) {
    const stats = await db('messages')
      .where({ conversation_id: conversationId })
      .select('role')
      .count('* as count')
      .groupBy('role');

    const result = {
      total: 0,
      user: 0,
      assistant: 0,
      system: 0
    };

    stats.forEach(stat => {
      result[stat.role] = parseInt(stat.count);
      result.total += parseInt(stat.count);
    });

    return result;
  }

  static format(message) {
    if (!message) return null;
    
    return {
      id: message.id,
      conversationId: message.conversation_id,
      role: message.role,
      content: message.content,
      rawContent: message.raw_content,
      metadata: typeof message.metadata === 'string' ? JSON.parse(message.metadata) : message.metadata,
      sequenceOrder: message.sequence_order,
      tokenCount: message.token_count,
      createdAt: message.created_at,
      updatedAt: message.updated_at
    };
  }
}

module.exports = Message;