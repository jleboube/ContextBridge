const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Project = require('../models/Project');
const { authenticateToken } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { generalRateLimit } = require('../middleware/rateLimiter');

// Apply authentication to all routes
router.use(authenticateToken);

// Get conversations for a project
router.get('/project/:projectId', generalRateLimit, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;

    // Verify project belongs to user
    const project = await Project.findById(projectId);
    if (!project || project.userId !== req.user.id) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const conversations = await Conversation.findByProject(projectId, {
      status,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get conversation by ID with messages
router.get('/:id', generalRateLimit, async (req, res) => {
  try {
    const conversation = await Conversation.getWithMessages(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Verify project belongs to user
    const project = await Project.findById(conversation.projectId);
    if (!project || project.userId !== req.user.id) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ conversation });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new conversation
router.post('/', generalRateLimit, validate(schemas.conversation), async (req, res) => {
  try {
    const { projectId, title, aiProvider, modelVersion } = req.body;

    // Verify project belongs to user
    const project = await Project.findById(projectId);
    if (!project || project.userId !== req.user.id) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const conversation = await Conversation.create({
      projectId,
      title,
      aiProvider,
      modelVersion
    });

    // Update project last activity
    await Project.updateLastActivity(projectId);

    res.status(201).json({ 
      message: 'Conversation created successfully',
      conversation 
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update conversation
router.put('/:id', generalRateLimit, async (req, res) => {
  try {
    const { title, contextSummary, status } = req.body;
    
    // Get conversation and verify ownership
    const existingConversation = await Conversation.findById(req.params.id);
    if (!existingConversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const project = await Project.findById(existingConversation.projectId);
    if (!project || project.userId !== req.user.id) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const conversation = await Conversation.update(req.params.id, {
      title,
      contextSummary,
      status
    });

    res.json({ 
      message: 'Conversation updated successfully',
      conversation 
    });
  } catch (error) {
    console.error('Update conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete conversation
router.delete('/:id', generalRateLimit, async (req, res) => {
  try {
    // Get conversation and verify ownership
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const project = await Project.findById(conversation.projectId);
    if (!project || project.userId !== req.user.id) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const deleted = await Conversation.delete(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;