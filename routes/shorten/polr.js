'use strict';

// Required modules
const S3 = require('../../lib/s3.js');
const url = require('url');
const util = require('../../lib/util.js');

// Load configuration
const config = require('../../config.json');

// URL regex (taken from https://gist.github.com/dperini/729294)
// Credit to @dperini
const URLRegex = /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,}))\.?)(?::\d{2,5})?(?:[/?#]\S*)?$/i;
const UWURegex = /(?:https?:\/\/)(?:www)?(uwu.whats-th\.is|awau\.moe)/i;

/**
 * Handle Polr link shortens.
 */
module.exports = (req, res) => {
  // Set Content-Type to text/plain
  if (res._headersSent || res.finished) return;
  res.setHeader('Content-Type', 'text/plain');

  // Parse the URL
  const urlParsed = url.parse(req.url, true);

  // Check if the action === "shorten"
  if (urlParsed.query['action'] !== 'shorten') {
    return res.end(400, 'Bad Request', 'invalid action, must be "shorten"');
  }

  // Check the URL in the request
  if (!URLRegex.test(urlParsed.query['url']) || UWURegex.test(urlParsed.query['url'])) {
    return res.end(400, 'Bad Request', 'invalid URL');
  }

  // Generate a key
  const key = util.generateRandomKey();

  // Create the object
  S3.putObject({
    Bucket: `${process.env.SERVICE}-linkshortener-${process.env.STAGE}-1`,
    Key: key,
    Body: '',
    ContentType: 'text/plain',
    StorageClass: 'REDUCED_REDUNDANCY',
    WebsiteRedirectLocation: urlParsed.query['url']
  }, (err, data) => {
    if (err) {
      console.error('Failed to upload linkshortener file to S3:');
      console.error(err);
      return res.end(500, 'Internal Server Error', 'internal server error');
    }

    // Return the URL to the client
    return res.end(200, 'OK', config.linkShortenerPrefix + key);
  });
};
