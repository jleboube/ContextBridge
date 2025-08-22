exports.up = function(knex) {
  return knex.schema.createTable('teams', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('owner_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('name').notNullable();
    table.text('description').nullable();
    table.string('avatar_url').nullable();
    table.enum('subscription_tier', ['free', 'pro', 'enterprise']).defaultTo('free');
    table.json('settings').defaultTo('{}');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    table.index(['owner_id']);
    table.index(['is_active']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('teams');
};