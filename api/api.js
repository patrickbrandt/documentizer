const restify = require('restify');
const server = restify.createServer();

server.listen(8080, () => {
  console.log('ready on %s', server.url);
});

server.get('/', function (req, res, next) {
   res.send({ hello: 'world' });
   next();
});