const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Project = require('../models/Project');
const { authenticateToken } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { generalRateLimit } = require('../middleware/rateLimiter');

// Apply authentication to all routes
router.use(authenticateToken);

// Add single message to conversation
router.post('/', generalRateLimit, validate(schemas.message), async (req, res) => {
  try {
    const { conversationId, role, content, rawContent, metadata } = req.body;

    // Verify conversation exists and user has access
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const project = await Project.findById(conversation.projectId);
    if (!project || project.userId !== req.user.id) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get next sequence order
    const sequenceOrder = await Message.getNextSequenceOrder(conversationId);

    const message = await Message.create({
      conversationId,
      role,
      content,
      rawContent,
      metadata,
      sequenceOrder
    });

    // Update conversation message count and project activity
    await Conversation.incrementMessageCount(conversationId);
    await Project.updateLastActivity(project.id);

    res.status(201).json({ 
      message: 'Message added successfully',
      data: message 
    });
  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add multiple messages to conversation (batch import)
router.post('/batch', generalRateLimit, validate(schemas.messageBatch), async (req, res) => {
  try {
    const { conversationId, messages } = req.body;

    // Verify conversation exists and user has access
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const project = await Project.findById(conversation.projectId);
    if (!project || project.userId !== req.user.id) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get starting sequence order
    let sequenceOrder = await Message.getNextSequenceOrder(conversationId);

    // Prepare messages with sequence orders
    const messagesWithSequence = messages.map(msg => ({
      conversationId,
      role: msg.role,
      content: msg.content,
      rawContent: msg.rawContent,
      metadata: msg.metadata || {},
      sequenceOrder: sequenceOrder++
    }));

    const createdMessages = await Message.createBatch(messagesWithSequence);

    // Update conversation message count and project activity
    await Conversation.incrementMessageCount(conversationId, messages.length);
    await Project.updateLastActivity(project.id);

    res.status(201).json({ 
      message: `${messages.length} messages added successfully`,
      data: createdMessages 
    });
  } catch (error) {
    console.error('Batch add messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get messages for a conversation
router.get('/conversation/:conversationId', generalRateLimit, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    // Verify conversation exists and user has access
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const project = await Project.findById(conversation.projectId);
    if (!project || project.userId !== req.user.id) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const messages = await Message.findByConversation(conversationId, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update message
router.put('/:id', generalRateLimit, async (req, res) => {
  try {
    const { content, metadata } = req.body;
    
    // Get message and verify ownership through conversation -> project -> user
    const existingMessage = await Message.findById(req.params.id);
    if (!existingMessage) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const conversation = await Conversation.findById(existingMessage.conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const project = await Project.findById(conversation.projectId);
    if (!project || project.userId !== req.user.id) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const message = await Message.update(req.params.id, {
      content,
      metadata
    });

    res.json({ 
      message: 'Message updated successfully',
      data: message 
    });
  } catch (error) {
    console.error('Update message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete message
router.delete('/:id', generalRateLimit, async (req, res) => {
  try {
    // Get message and verify ownership
    const existingMessage = await Message.findById(req.params.id);
    if (!existingMessage) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const conversation = await Conversation.findById(existingMessage.conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const project = await Project.findById(conversation.projectId);
    if (!project || project.userId !== req.user.id) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const deleted = await Message.delete(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Decrement conversation message count
    await db('conversations')
      .where({ id: conversation.id })
      .decrement('message_count', 1);

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get conversation statistics
router.get('/conversation/:conversationId/stats', generalRateLimit, async (req, res) => {
  try {
    const { conversationId } = req.params;

    // Verify conversation exists and user has access
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const project = await Project.findById(conversation.projectId);
    if (!project || project.userId !== req.user.id) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const stats = await Message.getConversationStats(conversationId);
    res.json({ stats });
  } catch (error) {
    console.error('Get message stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;