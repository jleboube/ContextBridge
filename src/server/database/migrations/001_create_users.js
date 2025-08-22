exports.up = function(knex) {
  return knex.schema.createTable('users', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email').unique().notNullable();
    table.string('password_hash').nullable(); // nullable for OAuth users
    table.string('first_name').notNullable();
    table.string('last_name').notNullable();
    table.string('profile_picture_url').nullable();
    table.enum('auth_provider', ['local', 'google']).defaultTo('local');
    table.string('google_id').unique().nullable();
    table.boolean('email_verified').defaultTo(false);
    table.timestamp('last_login_at').nullable();
    table.timestamps(true, true);
    
    table.index(['email']);
    table.index(['google_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('users');
};