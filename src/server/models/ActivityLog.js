const db = require('../database/connection');

class ActivityLog {
  static async create({ teamId, projectId, conversationId, userId, action, metadata = {}, description }) {
    const [activity] = await db('activity_log')
      .insert({
        team_id: teamId,
        project_id: projectId,
        conversation_id: conversationId,
        user_id: userId,
        action,
        metadata: JSON.stringify(metadata),
        description
      })
      .returning('*');
    
    return this.format(activity);
  }

  static async getTeamActivity(teamId, options = {}) {
    const { limit = 50, offset = 0, userId = null, actions = null } = options;

    // Verify user has access to team
    if (userId) {
      const memberCheck = await db('team_members')
        .where({ team_id: teamId, user_id: userId, status: 'active' })
        .first();
      
      if (!memberCheck) {
        throw new Error('Access denied');
      }
    }

    let query = db('activity_log')
      .leftJoin('users', 'activity_log.user_id', 'users.id')
      .leftJoin('projects', 'activity_log.project_id', 'projects.id')
      .leftJoin('conversations', 'activity_log.conversation_id', 'conversations.id')
      .where('activity_log.team_id', teamId)
      .select(
        'activity_log.*',
        'users.first_name',
        'users.last_name',
        'users.email',
        'projects.name as project_name',
        'conversations.title as conversation_title'
      )
      .orderBy('activity_log.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    if (actions && Array.isArray(actions)) {
      query = query.whereIn('activity_log.action', actions);
    }

    const activities = await query;

    return activities.map(activity => this.formatWithRelations(activity));
  }

  static async getProjectActivity(projectId, userId, options = {}) {
    const { limit = 20, offset = 0 } = options;

    // Verify user has access to project
    const project = await db('projects').where({ id: projectId }).first();
    if (!project) {
      throw new Error('Project not found');
    }

    // Check if it's a personal project or team project
    if (project.team_id) {
      const memberCheck = await db('team_members')
        .where({ team_id: project.team_id, user_id: userId, status: 'active' })
        .first();
      
      if (!memberCheck) {
        throw new Error('Access denied');
      }
    } else if (project.user_id !== userId) {
      throw new Error('Access denied');
    }

    const activities = await db('activity_log')
      .leftJoin('users', 'activity_log.user_id', 'users.id')
      .leftJoin('conversations', 'activity_log.conversation_id', 'conversations.id')
      .where('activity_log.project_id', projectId)
      .select(
        'activity_log.*',
        'users.first_name',
        'users.last_name',
        'users.email',
        'conversations.title as conversation_title'
      )
      .orderBy('activity_log.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return activities.map(activity => this.formatWithRelations(activity));
  }

  static async logProjectActivity(projectId, userId, action, metadata = {}, description = null) {
    // Get project to determine if it's part of a team
    const project = await db('projects').where({ id: projectId }).first();
    
    return this.create({
      teamId: project?.team_id || null,
      projectId,
      userId,
      action,
      metadata,
      description
    });
  }

  static async logConversationActivity(conversationId, userId, action, metadata = {}, description = null) {
    // Get conversation and project to determine team
    const conversation = await db('conversations')
      .join('projects', 'conversations.project_id', 'projects.id')
      .where('conversations.id', conversationId)
      .select('conversations.project_id', 'projects.team_id')
      .first();
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    return this.create({
      teamId: conversation.team_id || null,
      projectId: conversation.project_id,
      conversationId,
      userId,
      action,
      metadata,
      description
    });
  }

  static async logTeamActivity(teamId, userId, action, metadata = {}, description = null) {
    return this.create({
      teamId,
      userId,
      action,
      metadata,
      description
    });
  }

  static async getActivityStats(teamId, userId, timeframe = '30d') {
    // Verify access
    const memberCheck = await db('team_members')
      .where({ team_id: teamId, user_id: userId, status: 'active' })
      .first();
    
    if (!memberCheck) {
      throw new Error('Access denied');
    }

    const daysAgo = parseInt(timeframe.replace('d', ''));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    const stats = await db('activity_log')
      .where('team_id', teamId)
      .where('created_at', '>=', startDate)
      .select('action')
      .count('* as count')
      .groupBy('action');

    const dailyActivity = await db('activity_log')
      .where('team_id', teamId)
      .where('created_at', '>=', startDate)
      .select(db.raw('DATE(created_at) as date'))
      .count('* as count')
      .groupBy(db.raw('DATE(created_at)'))
      .orderBy('date', 'asc');

    const topUsers = await db('activity_log')
      .join('users', 'activity_log.user_id', 'users.id')
      .where('activity_log.team_id', teamId)
      .where('activity_log.created_at', '>=', startDate)
      .select('users.first_name', 'users.last_name', 'users.email')
      .count('* as activity_count')
      .groupBy('users.id', 'users.first_name', 'users.last_name', 'users.email')
      .orderBy('activity_count', 'desc')
      .limit(5);

    return {
      actionBreakdown: stats.reduce((acc, stat) => {
        acc[stat.action] = parseInt(stat.count);
        return acc;
      }, {}),
      dailyActivity: dailyActivity.map(day => ({
        date: day.date,
        count: parseInt(day.count)
      })),
      topUsers: topUsers.map(user => ({
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        activityCount: parseInt(user.activity_count)
      })),
      timeframe,
      totalActivities: stats.reduce((total, stat) => total + parseInt(stat.count), 0)
    };
  }

  static format(activity) {
    if (!activity) return null;
    
    return {
      id: activity.id,
      teamId: activity.team_id,
      projectId: activity.project_id,
      conversationId: activity.conversation_id,
      userId: activity.user_id,
      action: activity.action,
      metadata: typeof activity.metadata === 'string' ? JSON.parse(activity.metadata) : activity.metadata,
      description: activity.description,
      createdAt: activity.created_at
    };
  }

  static formatWithRelations(activity) {
    const formatted = this.format(activity);
    
    if (formatted) {
      formatted.user = {
        firstName: activity.first_name,
        lastName: activity.last_name,
        email: activity.email
      };
      
      if (activity.project_name) {
        formatted.project = {
          name: activity.project_name
        };
      }
      
      if (activity.conversation_title) {
        formatted.conversation = {
          title: activity.conversation_title
        };
      }
    }
    
    return formatted;
  }

  // Helper method to generate activity descriptions
  static generateDescription(action, metadata = {}) {
    const descriptions = {
      'project_created': `Created project "${metadata.projectName}"`,
      'project_updated': `Updated project "${metadata.projectName}"`,
      'project_shared': `Shared project "${metadata.projectName}" with team`,
      'conversation_created': `Created conversation "${metadata.conversationTitle}" in ${metadata.projectName}`,
      'conversation_updated': `Updated conversation "${metadata.conversationTitle}"`,
      'conversation_summarized': `Generated summary for conversation "${metadata.conversationTitle}"`,
      'message_added': `Added message to "${metadata.conversationTitle}"`,
      'export_created': `Exported project "${metadata.projectName}" as ${metadata.format}`,
      'team_joined': `Joined the team`,
      'team_left': `Left the team`,
      'user_invited': `Invited ${metadata.inviteeEmail} to join the team`
    };

    return descriptions[action] || `Performed action: ${action}`;
  }
}

module.exports = ActivityLog;