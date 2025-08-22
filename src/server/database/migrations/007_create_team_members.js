exports.up = function(knex) {
  return knex.schema.createTable('team_members', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('team_id').references('id').inTable('teams').onDelete('CASCADE');
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.enum('role', ['member', 'admin', 'owner']).defaultTo('member');
    table.enum('status', ['pending', 'active', 'inactive']).defaultTo('pending');
    table.json('permissions').defaultTo('{}');
    table.timestamp('joined_at').nullable();
    table.timestamp('invited_at').defaultTo(knex.fn.now());
    table.uuid('invited_by').references('id').inTable('users').nullable();
    table.timestamps(true, true);
    
    table.unique(['team_id', 'user_id']);
    table.index(['team_id']);
    table.index(['user_id']);
    table.index(['status']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('team_members');
};