// Required modules
const AWS = require('aws-sdk');

// Create database client service configuration object
let serviceConf = {
  apiVersion: '2012-08-10',
  region: process.env['AWS_REGION'],
  accessKeyId: process.env['AWS_ACCESSKEY'],
  secretAccessKey: process.env['AWS_SECRETKEY']
};
if (process.env['AWS_REGION'] === 'local') {
  serviceConf = {
    apiVersion: '2012-08-10',
    accessKeyId: 'abc123',
    secretAccessKey: 'abc123',
    region: 'local',
    endpoint: new AWS.Endpoint('http://localhost:8000')
  };
}

// Create document client
module.exports = new AWS.DynamoDB.DocumentClient({
  service: new AWS.DynamoDB(serviceConf)
});
