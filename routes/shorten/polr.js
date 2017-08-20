const url = require('url');
const util = require('../../lib/util.js');
const db = require('../lib/database.js');

// Load configuration
const config = require('../../config.json');

// URL regex (taken from https://gist.github.com/dperini/729294)
// Credit to @dperini
const URLRegex = /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,}))\.?)(?::\d{2,5})?(?:[/?#]\S*)?$/i;
const UWURegex = /^(?:https?:\/\/)(?:www)?(uwu.whats-th\.is|awau\.moe|thats-a\.link)/i;

/**
 * Handle Polr link shortens.
 */
module.exports = (req, res) => {
  if (res._headersSent || res.finished) return;
  res.setHeader('Content-Type', 'text/plain');
  const query = url.parse(req.url, true).query;
  if (query.action !== 'shorten') { // only "shorten" supported
    return res.end(400, 'invalid action, must be "shorten"');
  }
  if (!URLRegex.test(query.url) || UWURegex.test(query.url)) {
    return res.end(400, 'invalid URL');
  }

  // Create the object
  const key = util.generateRandomKey();
  db.query('INSERT INTO objects (bucket_key, bucket, key, dir, type, dest_url, content_type) VALUES ($1, \'public\', $2, \'/\', 1, $3, NULL)', ['public/' + key, '/' + key, query.url]).then(data => {
    let resUrl = config.linkShortenerPrefix;
    if (typeof query.resultUrl === 'string') {
      resUrl = query.resultUrl[query.resultUrl.length - 1] === '/' ? query.resultUrl : query.resultUrl + '/';
    }
    return res.end(200, resUrl + key);
  }).catch(err => {
    console.error('Failed to process database query');
    console.error(err);
    return res.end(500, 'internal server error');
  });
};
