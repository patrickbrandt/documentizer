const restify = require('restify');
const {Aws} = require('../shared');

const server = restify.createServer();
const aws = new Aws(process.env.DYNAMODB_ENDPOINT);
const dynamodb = aws.dynamodb;
const doc = aws.doc;

server.listen(8080, () => {
  console.log(`ready on ${server.url}`);
});

server.get('/', (req, res, next) => {
  res.send({ foo: 'bar' });
  next();
});

function pluckArticles(items) {
  const articles = [];
  items.map(item => {
    articles.push(item.article);
  });
  return articles;
}

async function sendArticles(req, res, next) {
  if(!req.params.id) {
    const data = await doc.scan({ TableName: 'articleDoc' }).promise();
    res.send(pluckArticles(data.Items));
    return next();
  }

  const params = {
    TableName: 'articleDoc',
    Key: {
      id: parseInt(req.params.id),
    },
  };
  const data = await doc.get(params).promise();
  res.send(data.Item.article);
  next();
}

server.get('/articles', sendArticles);
server.get('/articles/:id', sendArticles);

/* TODO: query by name as well: /article/author?name={name} */
server.get('/articles/author/:id', async (req, res, next) => {
  let params = {
    TableName: 'articleDoc',
    IndexName: 'userId-index',
    KeyConditionExpression: 'userId = :uId',
    ExpressionAttributeValues: {
      ':uId': parseInt(req.params.id),
    },
  };
  const data = await doc.query(params).promise();
  res.send(pluckArticles(data.Items));
  next();
});
