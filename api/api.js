const restify = require('restify');
const {Aws} = require('../shared');

const server = restify.createServer();
const aws = new Aws(process.env.DYNAMODB_ENDPOINT);
const dynamodb = aws.dynamodb;
const doc = aws.doc;

server.listen(8080, () => {
  console.log('ready on %s', server.url);
});

server.get('/', (req, res, next) => {
  res.send({ hello: 'world' });
  next();
});

function pluckArticles(items) {
  const articles = [];
  items.map(item => {
    articles.push(item.article);
  })
  return articles;
}

server.get('/article', async (req, res, next) => {
  const data = await doc.scan({ TableName: 'articleDoc' }).promise();
  res.send(pluckArticles(data.Items));
  next();
});

server.get('/article/:id', async (req, res, next) => {
  //console.log(JSON.stringify(req));
  const params = {
    TableName: 'articleDoc',
    Key: {
      id: parseInt(req.params.id),
    },
  };
  const data = await doc.get(params).promise();  
  res.send(data.Item.article);
  next();
});

/* TODO: query by name as well: /article/author?name={name} */
server.get('/article/author/:id', async (req, res, next) => {
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