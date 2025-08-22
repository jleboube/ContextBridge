const db = require('../database/connection');

class Team {
  static async create({ ownerId, name, description, subscriptionTier = 'free' }) {
    const [team] = await db('teams')
      .insert({
        owner_id: ownerId,
        name,
        description,
        subscription_tier: subscriptionTier
      })
      .returning('*');
    
    // Add owner as team member
    await db('team_members')
      .insert({
        team_id: team.id,
        user_id: ownerId,
        role: 'owner',
        status: 'active',
        joined_at: db.fn.now()
      });
    
    return this.format(team);
  }

  static async findById(id) {
    const team = await db('teams')
      .where({ id })
      .first();
    
    return team ? this.format(team) : null;
  }

  static async findByUser(userId) {
    const teams = await db('teams')
      .join('team_members', 'teams.id', 'team_members.team_id')
      .where('team_members.user_id', userId)
      .where('team_members.status', 'active')
      .where('teams.is_active', true)
      .select('teams.*', 'team_members.role', 'team_members.joined_at')
      .orderBy('teams.created_at', 'desc');

    return teams.map(team => ({
      ...this.format(team),
      userRole: team.role,
      joinedAt: team.joined_at
    }));
  }

  static async update(id, updates, userId) {
    // Verify user has admin access
    const memberCheck = await db('team_members')
      .where({ team_id: id, user_id: userId, status: 'active' })
      .whereIn('role', ['admin', 'owner'])
      .first();
    
    if (!memberCheck) {
      throw new Error('Insufficient permissions');
    }

    const allowedFields = ['name', 'description', 'avatar_url', 'settings'];
    const filteredUpdates = {};
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        if (key === 'settings') {
          filteredUpdates[key] = JSON.stringify(updates[key]);
        } else {
          filteredUpdates[key] = updates[key];
        }
      }
    });

    if (Object.keys(filteredUpdates).length === 0) return null;

    const [team] = await db('teams')
      .where({ id })
      .update(filteredUpdates)
      .returning('*');
    
    return team ? this.format(team) : null;
  }

  static async delete(id, userId) {
    // Verify user is owner
    const ownerCheck = await db('teams')
      .where({ id, owner_id: userId })
      .first();
    
    if (!ownerCheck) {
      throw new Error('Only team owner can delete team');
    }

    const deleted = await db('teams')
      .where({ id })
      .del();
    
    return deleted > 0;
  }

  static async getMembers(teamId, userId) {
    // Verify user is team member
    const memberCheck = await db('team_members')
      .where({ team_id: teamId, user_id: userId, status: 'active' })
      .first();
    
    if (!memberCheck) {
      throw new Error('Access denied');
    }

    const members = await db('team_members')
      .join('users', 'team_members.user_id', 'users.id')
      .where('team_members.team_id', teamId)
      .select(
        'team_members.*',
        'users.email',
        'users.first_name',
        'users.last_name',
        'users.profile_picture_url'
      )
      .orderBy('team_members.role', 'desc')
      .orderBy('team_members.joined_at', 'asc');

    return members.map(member => ({
      id: member.id,
      userId: member.user_id,
      role: member.role,
      status: member.status,
      joinedAt: member.joined_at,
      invitedAt: member.invited_at,
      user: {
        email: member.email,
        firstName: member.first_name,
        lastName: member.last_name,
        profilePictureUrl: member.profile_picture_url
      }
    }));
  }

  static async inviteMember(teamId, email, role = 'member', invitedBy) {
    // Verify inviter has admin access
    const adminCheck = await db('team_members')
      .where({ team_id: teamId, user_id: invitedBy, status: 'active' })
      .whereIn('role', ['admin', 'owner'])
      .first();
    
    if (!adminCheck) {
      throw new Error('Insufficient permissions to invite members');
    }

    // Find user by email
    const user = await db('users').where({ email }).first();
    if (!user) {
      throw new Error('User not found');
    }

    // Check if already a member
    const existingMember = await db('team_members')
      .where({ team_id: teamId, user_id: user.id })
      .first();
    
    if (existingMember) {
      if (existingMember.status === 'active') {
        throw new Error('User is already a team member');
      } else {
        // Reactivate existing invitation
        await db('team_members')
          .where({ id: existingMember.id })
          .update({
            role,
            status: 'pending',
            invited_at: db.fn.now(),
            invited_by: invitedBy
          });
        
        return existingMember.id;
      }
    }

    const [member] = await db('team_members')
      .insert({
        team_id: teamId,
        user_id: user.id,
        role,
        status: 'pending',
        invited_by: invitedBy
      })
      .returning('*');

    return member.id;
  }

  static async acceptInvitation(teamId, userId) {
    const invitation = await db('team_members')
      .where({ team_id: teamId, user_id: userId, status: 'pending' })
      .first();
    
    if (!invitation) {
      throw new Error('No pending invitation found');
    }

    await db('team_members')
      .where({ id: invitation.id })
      .update({
        status: 'active',
        joined_at: db.fn.now()
      });

    return true;
  }

  static async removeMember(teamId, memberUserId, removedBy) {
    // Verify remover has admin access or is removing themselves
    if (memberUserId !== removedBy) {
      const adminCheck = await db('team_members')
        .where({ team_id: teamId, user_id: removedBy, status: 'active' })
        .whereIn('role', ['admin', 'owner'])
        .first();
      
      if (!adminCheck) {
        throw new Error('Insufficient permissions');
      }
    }

    // Cannot remove team owner
    const memberToRemove = await db('team_members')
      .where({ team_id: teamId, user_id: memberUserId })
      .first();
    
    if (memberToRemove && memberToRemove.role === 'owner') {
      throw new Error('Cannot remove team owner');
    }

    const removed = await db('team_members')
      .where({ team_id: teamId, user_id: memberUserId })
      .del();
    
    return removed > 0;
  }

  static async getTeamStats(teamId, userId) {
    // Verify user is team member
    const memberCheck = await db('team_members')
      .where({ team_id: teamId, user_id: userId, status: 'active' })
      .first();
    
    if (!memberCheck) {
      throw new Error('Access denied');
    }

    const stats = await Promise.all([
      db('team_members').where({ team_id: teamId, status: 'active' }).count('* as count'),
      db('projects').where({ team_id: teamId }).count('* as count'),
      db('conversations')
        .join('projects', 'conversations.project_id', 'projects.id')
        .where('projects.team_id', teamId)
        .count('* as count'),
      db('activity_log').where({ team_id: teamId }).count('* as count')
    ]);

    return {
      memberCount: parseInt(stats[0][0].count),
      projectCount: parseInt(stats[1][0].count),
      conversationCount: parseInt(stats[2][0].count),
      activityCount: parseInt(stats[3][0].count)
    };
  }

  static format(team) {
    if (!team) return null;
    
    return {
      id: team.id,
      ownerId: team.owner_id,
      name: team.name,
      description: team.description,
      avatarUrl: team.avatar_url,
      subscriptionTier: team.subscription_tier,
      settings: typeof team.settings === 'string' ? JSON.parse(team.settings) : team.settings,
      isActive: team.is_active,
      createdAt: team.created_at,
      updatedAt: team.updated_at
    };
  }
}

module.exports = Team;