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

server.get('/article', async (req, res, next) => {
  const articles = await doc.scan({ TableName: 'articleDoc' }).promise();
  res.send(articles.Items);
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
  res.send(data.Item);
  next();
});