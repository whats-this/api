// Copyright Gus Caplan 2016
// Modified to suit whats-this by Aurieh and Dean.

const { compileURL, matchURL } = require('./urlUtils.js');

// Supported HTTP verbs
const HTTPVerbs = ['delete', 'get', 'head', 'post', 'put'];

/**
 * Apply each series.
 * @param {function[]} fns
 * @param {...*} args Arguments to call with each function, the last arg is the
 * end callback.
 */
function applyEachSeries (fns, ...args) {
  const iterator = fns[Symbol.iterator]();
  const final = args[args.length - 1];
  (function cb () {
    const x = iterator.next();
    if (x.done) return final();
    x.value(...args.slice(0, args.length - 1), cb);
  })();
}

/**
 * HTTP request router for Node.js.
 */
class Superhero {
  constructor () {
    this.handlers = {};
    this.middleware = [];
  }

  /**
   * Request listener
   */
  _requestListener (req, res) {
    // Default Content-Type, can be changed by a route handler if need be
    res.setHeader('Content-Type', 'application/json');
    const handlers = this.handlers[req.method.toLowerCase()];

    // Replace res.end with something a bit nicer
    res._end = res.end;
    res.end = (code, body) => {
      if (res._headersSent || res.finished) return;
      res.writeHead(code, {
        'Content-Length': Buffer.byteLength(body, 'utf8')
      });
      res._end(body);
    };

    // Run the middleware functions in order
    applyEachSeries(this.middleware, req, res, () => {
      // Find and run the associated handler
      let matched = false;
      for (const handler in handlers) {
        if (matchURL(handlers[handler].path, req)) {
          handlers[handler].handler(req, res);
          matched = true;
          return;
        }
      }

      // 404 Not Found
      if (!matched) {
        return res.end(404, JSON.stringify({
          success: false,
          errorcode: 404,
          description: 'Not found'
        }));
      }
    });
  }

  /**
   * Add middleware to router.
   * @param {function} fn
   */
  use (fn) {
    this.middleware.push(fn);
  }
}

// Add HTTP verb functions to prototype
for (const verb of HTTPVerbs) {
  Superhero.prototype[verb] = function (path, handler) {
    path = compileURL({ url: path });
    if (!this.handlers[verb]) this.handlers[verb] = {};
    this.handlers[verb][path] = { path, handler };
  };
}

// Expose Superhero
module.exports = Superhero;
