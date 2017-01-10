const AWS = require('aws-sdk');

// Create service configuration object
const serviceConfiguration = {
  apiVersion: '2006-03-01',
  accessKeyId: process.env.S3_FILES_ACCESS_KEY_ID,
  correctClockSkew: true,
  secretAccessKey: process.env.S3_FILES_SECRET_KEY,
  sslEnabled: true
};
if (process.env.hasOwnProperty('S3_FILES_ENDPOINT_URL')) {
  serviceConfiguration.endpoint = new AWS.Endpoint(process.env.S3_FILES_ENDPOINT_URL);
  serviceConfiguration.signatureVersion = 'v2';
}

// Create S3 client
module.exports = new AWS.S3(serviceConfiguration);
