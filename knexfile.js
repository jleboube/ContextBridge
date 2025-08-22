require('dotenv').config();

module.exports = {
  development: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL || {
      database: 'contextbridge',
      user: 'contextbridge',
      password: 'password',
      host: 'localhost',
      port: 5432
    },
    migrations: {
      directory: './src/server/database/migrations'
    },
    seeds: {
      directory: './src/server/database/seeds'
    }
  },

  production: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: './src/server/database/migrations'
    },
    seeds: {
      directory: './src/server/database/seeds'
    },
    pool: {
      min: 2,
      max: 10
    }
  }
};