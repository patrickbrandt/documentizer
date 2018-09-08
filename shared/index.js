const aws_sdk = require('aws-sdk');

class Aws {
  constructor(endpoint = 'http://dynamodb:8000', region = 'us-east-1', accessKeyId = 'Temp', secretAccessKey = 'Temp') {
    aws_sdk.config.update({
      accessKeyId,
      secretAccessKey,
      endpoint,
      region
    });

    this.dynamodb = new aws_sdk.DynamoDB();
    this.doc = new aws_sdk.DynamoDB.DocumentClient();
  }
};

class ArticleDocument {
  constructor(aws) {
    this.aws = aws;
  }

  get tableName() {
    return 'article';
  }

  async convert(articleRow) {
    const tableItem = await this.documentizeArticle(articleRow);
    const cleanDoc = await this.cleanupComments(tableItem);
    const params = {
      TableName: 'articleDoc',
      Item: cleanDoc,
    }
    try {
      await this.aws.doc.put(params).promise();
      console.log(`${this.tableName} id ${articleRow.id} documentized`);
    } catch(e) { console.log(e); throw e; }
  }

  documentizeArticle(articleRow) {
    const articleDoc = Object.assign({}, articleRow);
    return new Promise(async (resolve, reject) => {
      let params = {
        TableName: 'user2article',
        IndexName: 'articleId-index',
        KeyConditionExpression: 'articleId = :aId',
        ExpressionAttributeValues: {
          ':aId': articleRow.id,
        },
      };
      const user2article = await this.aws.doc.query(params).promise();
      const userId = user2article.Items[0].userId; //assuming just one author for now
      params = {
        TableName: 'user',
        KeyConditionExpression: 'id = :id',
        ExpressionAttributeValues: {
          ':id': userId,
        },
      };
      const user = await this.aws.doc.query(params).promise();
      articleDoc.authors = user.Items;
      params = {
        TableName: 'comment',
        IndexName: 'articleId-index',
        KeyConditionExpression: 'articleId = :aId',
        ExpressionAttributeValues: {
          ':aId': articleRow.id,
        },
      };
      const comment = await this.aws.doc.query(params).promise();
      articleDoc.comments = comment.Items;
      const articleItem = {
        id: articleRow.id, // DynamoDB parition key
        userId, // GSI for retrieving articles by author
        article: articleDoc, //regular attribute
      }
      resolve(articleItem);
    });
  }

  cleanupComments(articleItem) {
    const articleDoc = articleItem.article;
    return new Promise(async (resolve, reject) => {
      if (articleDoc.comments.length === 0) {
        return resolve(articleItem);
      }
      let count = 0;
      const comments = Object.assign([], articleDoc.comments);
      articleDoc.comments = [];
      for (const comment of comments) {
        const params = {
          TableName: 'user',
          Key: {
            id: comment.userId,
          },
        };
        const data = await this.aws.doc.get(params).promise();
        articleDoc.comments.push({
          id: comment.id,
          text: comment.text,
          date: comment.date,
          author: {
            id: data.Item.id,
            name: data.Item.name,
          }
        });
      }
      resolve(articleItem);
    });
  }
}

class Documentizer {
  constructor(tableName, aws) {
    this.aws = aws;
    this.strategy = new this.strategies[tableName](aws);
  }

  async convert(row) {
    await this.strategy.convert(row);
  }

  get strategies() {
    return {
      article: ArticleDocument,
    }
  }
}

module.exports = {
  Aws,
  Documentizer,
};
