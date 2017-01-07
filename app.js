// Required modules
const authorize = require('./lib/authorize.js');
const http = require('http');
const Router = require('./lib/superhero.js');

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

// Create a router and apply routes
var router = new Router();
router.use(authorize);
router.get('/shorten/polr', require('./routes/shorten/polr.js')); // GET /shorten/polr
router.post('/upload/pomf', require('./routes/upload/pomf.js')); // POST /upload/pomf
router.get('/health', function (req, res) {
  res.end(200 'OK', '');
});

// Create server
var server = http.createServer(router._requestListener.bind(router));

// Start server
server.listen(process.env['PORT'], () => {
  // TODO: logger
  console.log('Listening on ' + process.env['PORT']);
});
