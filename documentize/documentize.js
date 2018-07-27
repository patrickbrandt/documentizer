const Aws = require('../shared/aws');
const aws = new Aws(process.env.DYNAMODB_ENDPOINT);
const doc = aws.doc;

//TODO: documentize relational tables into article documents, comment docs, and user docs
// user doc --> name and articles
// comment doc --> partition key is article id, sort key is date, gsi is user id 
// article doc --> user id GSI, map type for article attribute includes user fields and first 10 comments

doc.scan({ TableName: 'article' }).promise()
  .then(data => {
    data.Items.map(articleRow => {
      documentizeArticle(articleRow)
        .then(articleDoc => cleanupComments(articleDoc))
        .then(articleDoc => {
          //console.log(`article ${articleRow.id} documentized: ${JSON.stringify(articleDoc)}\r\n`);          
          const params = {
            TableName: 'articleDoc',
            Item: articleDoc,
          }
          return doc.put(params).promise()
        })
        .then(data => console.log(`article saved ${JSON.stringify(data)}`))
        .catch(err => console.log(err));
    });
  })
  .catch(err => console.log(err));

function cleanupComments(articleDoc) {
  return new Promise((resolve, reject) => {
    if (articleDoc.comments.length === 0) {
      return resolve(articleDoc);
    }
    let count = 0;
    const comments = Object.assign([], articleDoc.comments);
    articleDoc.comments = [];
    comments.forEach((comment, index) => {
      params = {
        TableName: 'user',
        Key: {
          id: comment.userId,
        },
      };
      doc.get(params).promise()
        .then(data => {
          articleDoc.comments.push({
            id: comment.id,
            text: comment.text,
            date: comment.date,
            author: {
              id: data.Item.id,
              name: data.Item.name,
            }
          });

          //TODO: level up on async/await and see if there's a more elegant solution than this
          count++;
          if(count === comments.length) {
            resolve(articleDoc);              
          }
        })
        .catch(err => reject(err));
    });
  });
}

function documentizeArticle(articleRow) {
  const articleDoc = Object.assign({}, articleRow);
  return new Promise((resolve, reject) => {
    let params = {
      TableName: 'user2article',
      IndexName: 'articleId-index',
      KeyConditionExpression: 'articleId = :aId',
      ExpressionAttributeValues: {
        ':aId': articleRow.id,
      },
    };
    doc.query(params).promise()
      .then(data => {
        const userId = data.Items[0].userId; //assuming just one author for now
        params = {
          TableName: 'user',
          KeyConditionExpression: 'id = :id',
          ExpressionAttributeValues: {
            ':id': userId,
          },
        };
        return doc.query(params).promise();
      })
      .then(data => {
        articleDoc.authors = data.Items;
        params = {
          TableName: 'comment',
          IndexName: 'articleId-index',
          KeyConditionExpression: 'articleId = :aId',
          ExpressionAttributeValues: {
            ':aId': articleRow.id,
          },
        };
        return doc.query(params).promise();
      })
      .then(data => {
        articleDoc.comments = data.Items;
        resolve(articleDoc);
      })
      .catch(err => reject(err))
  });
   
}