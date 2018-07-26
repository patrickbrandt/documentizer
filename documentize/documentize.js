const Aws = require('../shared/aws');
const aws = new Aws(process.env.DYNAMODB_ENDPOINT);
const doc = aws.doc;

//TODO: documentize relational tables into article documents, comment docs, and user docs
// user doc --> name and articles
// comment doc --> partition key is article id, sort key is date gsi is user id, 
// article doc --> user id GSI, map type for article attribute includes user fields and first 10 comments

