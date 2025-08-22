exports.up = function(knex) {
  return knex.schema.createTable('plugin_installations', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('plugin_id').references('id').inTable('plugins').onDelete('CASCADE');
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').nullable();
    table.uuid('team_id').references('id').inTable('teams').onDelete('CASCADE').nullable();
    table.json('configuration').defaultTo('{}'); // Plugin-specific config
    table.boolean('is_enabled').defaultTo(true);
    table.json('permissions_granted').defaultTo('[]');
    table.timestamp('installed_at').defaultTo(knex.fn.now());
    table.timestamps(true, true);
    
    // Ensure plugin is installed for either user OR team, not both
    table.check('(user_id IS NOT NULL AND team_id IS NULL) OR (user_id IS NULL AND team_id IS NOT NULL)');
    table.unique(['plugin_id', 'user_id']);
    table.unique(['plugin_id', 'team_id']);
    
    table.index(['user_id']);
    table.index(['team_id']);
    table.index(['plugin_id']);
    table.index(['is_enabled']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('plugin_installations');
};