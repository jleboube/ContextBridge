const db = require('../database/connection');

class Project {
  static async create({ userId, name, description, tags = [] }) {
    const [project] = await db('projects')
      .insert({
        user_id: userId,
        name,
        description,
        tags: JSON.stringify(tags)
      })
      .returning('*');
    
    return this.format(project);
  }

  static async findById(id) {
    const project = await db('projects')
      .where({ id })
      .first();
    
    return project ? this.format(project) : null;
  }

  static async findByUser(userId, { status = null, limit = 50, offset = 0 } = {}) {
    let query = db('projects')
      .where({ user_id: userId })
      .orderBy('last_activity_at', 'desc')
      .limit(limit)
      .offset(offset);

    if (status) {
      query = query.where({ status });
    }

    const projects = await query;
    return projects.map(project => this.format(project));
  }

  static async update(id, userId, updates) {
    const allowedFields = ['name', 'description', 'tags', 'status'];
    const filteredUpdates = {};
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        if (key === 'tags') {
          filteredUpdates[key] = JSON.stringify(updates[key]);
        } else {
          filteredUpdates[key] = updates[key];
        }
      }
    });

    if (Object.keys(filteredUpdates).length === 0) return null;

    const [project] = await db('projects')
      .where({ id, user_id: userId })
      .update({
        ...filteredUpdates,
        last_activity_at: db.fn.now()
      })
      .returning('*');
    
    return project ? this.format(project) : null;
  }

  static async delete(id, userId) {
    const deleted = await db('projects')
      .where({ id, user_id: userId })
      .del();
    
    return deleted > 0;
  }

  static async updateLastActivity(id) {
    await db('projects')
      .where({ id })
      .update({ last_activity_at: db.fn.now() });
  }

  static async getStats(userId) {
    const stats = await db('projects')
      .where({ user_id: userId })
      .select('status')
      .count('* as count')
      .groupBy('status');

    const result = {
      total: 0,
      active: 0,
      archived: 0,
      completed: 0
    };

    stats.forEach(stat => {
      result[stat.status] = parseInt(stat.count);
      result.total += parseInt(stat.count);
    });

    return result;
  }

  static format(project) {
    if (!project) return null;
    
    return {
      id: project.id,
      userId: project.user_id,
      name: project.name,
      description: project.description,
      tags: typeof project.tags === 'string' ? JSON.parse(project.tags) : project.tags,
      status: project.status,
      lastActivityAt: project.last_activity_at,
      createdAt: project.created_at,
      updatedAt: project.updated_at
    };
  }
}

module.exports = Project;