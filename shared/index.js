const aws = require('aws-sdk');

class Aws {
  constructor(endpoint = 'http://192.168.99.100:8000', region = 'us-east-1', accessKeyId = 'Temp', secretAccessKey = 'Temp') {
    aws.config.update({
      accessKeyId,
      secretAccessKey,
      endpoint,
      region
    });

    this.dynamodb = new aws.DynamoDB();
    this.doc = new aws.DynamoDB.DocumentClient();
  }
};

module.exports = {Aws};