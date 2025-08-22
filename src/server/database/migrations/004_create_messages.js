exports.up = function(knex) {
  return knex.schema.createTable('messages', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('conversation_id').references('id').inTable('conversations').onDelete('CASCADE');
    table.enum('role', ['user', 'assistant', 'system']).notNullable();
    table.text('content').notNullable();
    table.text('raw_content').nullable(); // Original format if imported
    table.json('metadata').defaultTo('{}'); // Store additional info like timestamps, model params
    table.integer('sequence_order').notNullable();
    table.integer('token_count').nullable(); // For future optimization
    table.timestamps(true, true);
    
    table.index(['conversation_id']);
    table.index(['role']);
    table.index(['sequence_order']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('messages');
};