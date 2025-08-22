exports.up = function(knex) {
  return knex.schema.createTable('plugins', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable().unique();
    table.string('slug').notNullable().unique();
    table.text('description').nullable();
    table.string('version').notNullable();
    table.string('author').nullable();
    table.string('author_email').nullable();
    table.text('documentation_url').nullable();
    table.json('manifest').notNullable(); // Plugin capabilities and configuration
    table.enum('status', ['active', 'inactive', 'deprecated']).defaultTo('active');
    table.enum('type', ['integration', 'export', 'import', 'ai_provider', 'workflow']).notNullable();
    table.json('configuration_schema').nullable(); // JSON schema for plugin config
    table.text('webhook_url').nullable(); // For external integrations
    table.json('permissions').defaultTo('[]'); // Required permissions
    table.boolean('is_official').defaultTo(false);
    table.timestamps(true, true);
    
    table.index(['status']);
    table.index(['type']);
    table.index(['is_official']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('plugins');
};