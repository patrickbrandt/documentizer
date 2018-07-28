const {Aws} = require('../shared');
const aws = new Aws(process.env.DYNAMODB_ENDPOINT);
const doc = aws.doc;

//TODO: documentize relational tables into article documents, comment docs, and user docs
// user doc --> name and articles
// comment doc --> partition key is article id, sort key is date, gsi is user id 
// article doc --> user id GSI, map type for article attribute includes user fields and first 10 comments

//handy async/await error-handling article: https://javascript.info/async-await#error-handling
convertArticles().catch(err => console.log(err));

async function convertArticles() {
  const firstArticle = await doc.scan({ TableName: 'article', Limit: 1 }).promise();
  convertRecursive(firstArticle);
}

async function convertRecursive(articleRow) {
  if (!articleRow  || !articleRow.Items || articleRow.Items.length === 0) {
    return;
  }

  const articleItem = await documentizeArticle(articleRow.Items[0]);
  const cleanDoc = await cleanupComments(articleItem);
  const params = {
    TableName: 'articleDoc',
    Item: cleanDoc,
  }
  try {
    await doc.put(params).promise();
    console.log(`article id ${articleRow.Items[0].id} saved`);  
  } catch(e) { console.log(e); }

  //this isn't working per https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Scan.html#Scan.Pagination
  if (!articleRow.LastEvaluatedKey) {
    console.log('true');
    return;
  }

  const nextArticleRow = await doc.scan({ TableName: 'article', Limit: 1, ExclusiveStartKey: { id: articleRow.LastEvaluatedKey.id }}).promise();  
  convertRecursive(nextArticleRow);
}

function cleanupComments(articleItem) {
  const articleDoc = articleItem.article;
  return new Promise((resolve, reject) => {
    if (articleDoc.comments.length === 0) {
      return resolve(articleItem);
    }
    let count = 0;
    const comments = Object.assign([], articleDoc.comments);
    articleDoc.comments = [];
    comments.forEach(async (comment, index) => {
      params = {
        TableName: 'user',
        Key: {
          id: comment.userId,
        },
      };
      const data = await doc.get(params).promise();        
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
        resolve(articleItem); 
      }        
    });
  });
}

function documentizeArticle(articleRow) {
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
    const user2article = await doc.query(params).promise();
    const userId = user2article.Items[0].userId; //assuming just one author for now
    params = {
      TableName: 'user',
      KeyConditionExpression: 'id = :id',
      ExpressionAttributeValues: {
        ':id': userId,
      },
    };
    const user = await doc.query(params).promise();
    articleDoc.authors = user.Items;
    params = {
      TableName: 'comment',
      IndexName: 'articleId-index',
      KeyConditionExpression: 'articleId = :aId',
      ExpressionAttributeValues: {
        ':aId': articleRow.id,
      },
    };
    const comment = await doc.query(params).promise();
    articleDoc.comments = comment.Items;
    const articleItem = {
      id: articleRow.id, // DynamoDB parition key
      userId, // GSI for retrieving articles by author
      article: articleDoc, //regular attribute
    }
    resolve(articleItem);
  });
}
