'use strict';

// Required modules
const DynamoDB = require('./database.js');
const url = require('url');

/**
 * UUID regex. Taken from StackOverflow.
 * @see {@link http://stackoverflow.com/a/13653180 StackOverflow}
 */
const UUIDRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Handle authorization for the API.
 */
module.exports = (req, res, cb) => {
  let token = req.headers['authorization'] || url.parse(req.url, true).query['key'];
  if (!UUIDRegex.test(token)) {
    if (res.complete) return;
    return res.end(401, 'Unauthorized', JSON.stringify({
      success: false,
      errorcode: 401,
      description: 'Bad token'
    }));
  }

  // Try to fetch the user from the database
  DynamoDB.scan({
    TableName: `${process.env.SERVICE}-users-${process.env.STAGE}`,
    FilterExpression: '#user_token = :req_token',
    ExpressionAttributeNames: { '#user_token': 'token' },
    ExpressionAttributeValues: { ':req_token': token }
  }, (err, data) => {
    if (err) {
      console.log('Failed to perform database query');
      console.log(err);
      if (res.complete) return;
      return res.end(500, 'Internal Server Error', JSON.stringify({
        success: false,
        errorcode: 500,
        description: 'Internal Server Error'
      }));
    }

    if (data.Items.length === 0) {
      // Database query didn't match, therefore there are no users with this ID
      if (res.complete) return;
      res.writeHead(401, 'Unauthorized');
      return res.end(JSON.stringify({
        success: false,
        errorcode: 401,
        description: 'User does not exist'
      }));
    }

    if (data.Items[0].blocked) {
      // User is currently blocked
      if (res.complete) return;
      return res.end(401, 'Unauthorized', JSON.stringify({
        success: false,
        errorcode: 401,
        description: 'Blocked'
      }));
    }

    // Seems safe
    cb();
  });
};
