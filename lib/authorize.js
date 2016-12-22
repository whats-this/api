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
module.exports = function*(next) {
  let token = this.req.headers['authorization'] || url.parse(this.req.url, true).query['key'] || url.parse(this.req.url, true).query['apikey'];
  if (!UUIDRegex.test(token)) {
    return this.throw(JSON.stringify({
      success: false,
      errorcode: 401,
      description: 'Bad token'
    }), 401);
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
      return this.throw(JSON.stringify({
        success: false,
        errorcode: 500,
        description: 'Internal Server Error'
      }), 500);
    }

    if (data.Items.length === 0) {
      // Database query didn't match, therefore there are no users with this ID
      return this.throw(JSON.stringify({
        success: false,
        errorcode: 401,
        description: 'User does not exist'
      }), 401);
    }

    if (data.Items[0].blocked) {
      // User is currently blocked
      return this.throw(JSON.stringify({
        success: false,
        errorcode: 401,
        description: 'Blocked'
      }), 401);
    }

    // Seems safe
    next();
  });
};
