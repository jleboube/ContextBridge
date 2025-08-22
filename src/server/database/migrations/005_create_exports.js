exports.up = function(knex) {
  return knex.schema.createTable('exports', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE');
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.enum('format', ['json', 'markdown', 'pdf', 'context_prompt']).notNullable();
    table.enum('target_provider', ['openai', 'anthropic', 'google', 'mistral', 'generic']).nullable();
    table.text('exported_content').notNullable();
    table.json('export_options').defaultTo('{}'); // Store settings like compression level
    table.integer('file_size_bytes').nullable();
    table.timestamps(true, true);
    
    table.index(['project_id']);
    table.index(['user_id']);
    table.index(['format']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('exports');
};