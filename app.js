const authorize = require('./lib/authorize.js');
const http = require('http');
const Router = require('./lib/superhero.js');

// Check for required environment variables
for (const env of [
  'DATABASE_URL',
  'SEAWEED_HOST',
  'PORT'
]) {
  if (!process.env.hasOwnProperty(env)) {
    throw new Error(`missing required environment variable "${env}"`);
  }
}

// Create a router and apply routes
var router = new Router();
router.use(authorize);
router.get('/shorten/polr', require('./routes/shorten/polr.js')); // GET /shorten/polr
router.post('/upload/pomf', require('./routes/upload/pomf.js')); // POST /upload/pomf
router.post('/users', require('./routes/users/create.js'));
router.get('/users/me', require('./routes/users/me.js'));
router.get('/health', (req, res) => res.end(204, ''));

// Create server
var server = http.createServer(router._requestListener.bind(router));

// Start server
server.listen(process.env['PORT'], () => {
  console.log('Listening on ' + server.address().port);
});
