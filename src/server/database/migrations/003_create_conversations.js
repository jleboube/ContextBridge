exports.up = function(knex) {
  return knex.schema.createTable('conversations', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE');
    table.string('title').notNullable();
    table.enum('ai_provider', ['openai', 'anthropic', 'google', 'mistral', 'other']).notNullable();
    table.string('model_version').nullable();
    table.text('context_summary').nullable(); // For phase 2
    table.integer('message_count').defaultTo(0);
    table.enum('status', ['active', 'archived']).defaultTo('active');
    table.timestamps(true, true);
    
    table.index(['project_id']);
    table.index(['ai_provider']);
    table.index(['status']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('conversations');
};