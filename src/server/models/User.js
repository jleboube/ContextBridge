const db = require('../database/connection');
const bcrypt = require('bcryptjs');

class User {
  static async create({ email, password, firstName, lastName, authProvider = 'local', googleId = null }) {
    const passwordHash = password ? await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS)) : null;
    
    const [user] = await db('users')
      .insert({
        email,
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        auth_provider: authProvider,
        google_id: googleId
      })
      .returning('*');
    
    return this.sanitize(user);
  }

  static async findById(id) {
    const user = await db('users').where({ id }).first();
    return user ? this.sanitize(user) : null;
  }

  static async findByEmail(email) {
    const user = await db('users').where({ email }).first();
    return user ? this.sanitize(user) : null;
  }

  static async findByGoogleId(googleId) {
    const user = await db('users').where({ google_id: googleId }).first();
    return user ? this.sanitize(user) : null;
  }

  static async validatePassword(user, password) {
    if (!user.password_hash) return false;
    return await bcrypt.compare(password, user.password_hash);
  }

  static async updateLastLogin(id) {
    await db('users')
      .where({ id })
      .update({ last_login_at: db.fn.now() });
  }

  static async update(id, updates) {
    const allowedFields = ['first_name', 'last_name', 'profile_picture_url', 'email_verified'];
    const filteredUpdates = {};
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    if (Object.keys(filteredUpdates).length === 0) return null;

    const [user] = await db('users')
      .where({ id })
      .update(filteredUpdates)
      .returning('*');
    
    return user ? this.sanitize(user) : null;
  }

  static sanitize(user) {
    if (!user) return null;
    const { password_hash, ...sanitized } = user;
    return {
      ...sanitized,
      firstName: user.first_name,
      lastName: user.last_name,
      profilePictureUrl: user.profile_picture_url,
      authProvider: user.auth_provider,
      googleId: user.google_id,
      emailVerified: user.email_verified,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  }
}

module.exports = User;