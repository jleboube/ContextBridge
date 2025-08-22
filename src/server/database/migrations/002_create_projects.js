exports.up = function(knex) {
  return knex.schema.createTable('projects', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('name').notNullable();
    table.text('description').nullable();
    table.json('tags').defaultTo('[]');
    table.enum('status', ['active', 'archived', 'completed']).defaultTo('active');
    table.timestamp('last_activity_at').defaultTo(knex.fn.now());
    table.timestamps(true, true);
    
    table.index(['user_id']);
    table.index(['status']);
    table.index(['last_activity_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('projects');
};