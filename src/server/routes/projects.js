const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const { authenticateToken } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { generalRateLimit } = require('../middleware/rateLimiter');

// Apply authentication to all routes
router.use(authenticateToken);

// Get project statistics
router.get('/stats', generalRateLimit, async (req, res) => {
  try {
    const stats = await Project.getStats(req.user.id);
    res.json({ stats });
  } catch (error) {
    console.error('Get project stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all projects for authenticated user
router.get('/', generalRateLimit, async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    const projects = await Project.findByUser(req.user.id, {
      status,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({ projects });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get project by ID
router.get('/:id', generalRateLimit, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project || project.userId !== req.user.id) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ project });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new project
router.post('/', generalRateLimit, validate(schemas.project), async (req, res) => {
  try {
    const { name, description, tags } = req.body;
    
    const project = await Project.create({
      userId: req.user.id,
      name,
      description,
      tags: tags || []
    });

    res.status(201).json({ 
      message: 'Project created successfully',
      project 
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update project
router.put('/:id', generalRateLimit, validate(schemas.project), async (req, res) => {
  try {
    const { name, description, tags, status } = req.body;
    
    const project = await Project.update(req.params.id, req.user.id, {
      name,
      description,
      tags,
      status
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ 
      message: 'Project updated successfully',
      project 
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete project
router.delete('/:id', generalRateLimit, async (req, res) => {
  try {
    const deleted = await Project.delete(req.params.id, req.user.id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;