// Required modules
const AWS = require('aws-sdk');

// Create S3 client
module.exports = new AWS.S3({
  apiVersion: '2006-03-01',
  accessKeyId: process.env['AWS_ACCESSKEY'],
  secretAccessKey: process.env['AWS_SECRETKEY']
});
