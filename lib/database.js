const pg = require('pg');
const url = require('url');

const params = url.parse(process.env.DATABASE_URL);
const auth = params.auth.split(':');

// Create database client configuration object
const config = {
  user: auth[0],
  password: auth[1],
  host: params.hostname,
  port: params.port,
  database: params.pathname.split('/')[1],
  min: 2,
  max: 10,
  idleTimeoutMillis: 60 * 1000,
  ssl: process.env.DATABASE_SSL === 'true'
};

// Create Postgres pool client
module.exports = new pg.Pool(config);
