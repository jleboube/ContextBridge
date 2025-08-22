exports.up = function(knex) {
  return knex.schema.createTable('activity_log', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('team_id').references('id').inTable('teams').onDelete('CASCADE').nullable();
    table.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE').nullable();
    table.uuid('conversation_id').references('id').inTable('conversations').onDelete('CASCADE').nullable();
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.enum('action', [
      'project_created', 'project_updated', 'project_shared',
      'conversation_created', 'conversation_updated', 'conversation_summarized',
      'message_added', 'message_updated', 'message_deleted',
      'export_created', 'team_joined', 'team_left', 'user_invited'
    ]).notNullable();
    table.json('metadata').defaultTo('{}');
    table.text('description').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['team_id', 'created_at']);
    table.index(['project_id', 'created_at']);
    table.index(['user_id', 'created_at']);
    table.index(['action']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('activity_log');
};