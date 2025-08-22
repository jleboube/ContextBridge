exports.up = function(knex) {
  return knex.schema.table('projects', table => {
    table.uuid('team_id').references('id').inTable('teams').onDelete('CASCADE').nullable();
    table.enum('visibility', ['private', 'team', 'public']).defaultTo('private');
    table.json('collaboration_settings').defaultTo('{}');
    table.uuid('last_edited_by').references('id').inTable('users').nullable();
    table.timestamp('last_team_activity').nullable();
    
    table.index(['team_id']);
    table.index(['visibility']);
  });
};

exports.down = function(knex) {
  return knex.schema.table('projects', table => {
    table.dropColumn('team_id');
    table.dropColumn('visibility');
    table.dropColumn('collaboration_settings');
    table.dropColumn('last_edited_by');
    table.dropColumn('last_team_activity');
  });
};