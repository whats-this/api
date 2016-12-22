// Required modules
const authorize = require('./lib/authorize.js');
const koa = require('koa');
const route = require('koa-route');

// Check for required environment variables
for (let env of [
  'AWS_REGION',
  'AWS_ACCESSKEY',
  'AWS_SECRETKEY',
  'PORT',
  'SERVICE',
  'STAGE'
]) {
  if (!process.env.hasOwnProperty(env)) {
    throw new Error(`missing required environment variable "${env}"`);
  }
}

// Create a Koa app, and apply routes
var app = koa();

app.use(authorize);
app.use(route.get('/shorten/polr', require('./routes/shorten/polr.js'))); // GET /shorten/polr
app.use(route.post('/upload/pomf', require('./routes/upload/pomf.js'))); // POST /upload/pomf

// Start server
app.listen(process.env['PORT'], () => {
  // TODO: logger
  console.log('Listening on ' + process.env['PORT']);
});
