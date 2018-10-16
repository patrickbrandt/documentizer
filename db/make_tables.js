const fs = require('fs');
const {Aws} = require('../shared');
const {promisify} = require('util');
const aws = new Aws(process.env.DYNAMODB_ENDPOINT);

const schemaDirectory = process.env.SCHEMA_LOCATION || './tables/';
const sampleDataDirectory = process.env.DATA_LOCATION || './data/';
const dynamodb = aws.dynamodb;
const doc = aws.doc;
const readdirAsync = promisify(fs.readdir);

const run = async () => {
  const items = await readdirAsync(schemaDirectory);
  for (const item of items) {
    await makeTable(item);
  }
};

run();

async function makeTable(item){
  const table = item.split('.')[0];
  try {
    console.log(`making table ${table}`);
    await deleteTable(table);
    await createTable(table);
    await loadData(table);
  } catch (e) {
    console.log(`error making table ${table}: ${e}`);
  }
}

async function deleteTable(tableName) {
  try {
    await dynamodb.deleteTable({ TableName: tableName }).promise();
    await dynamodb.waitFor('tableNotExists', { TableName: tableName }).promise()
  } catch (e) {
    if (e && e.code === 'ResourceNotFoundException') {
      return console.log(`WARN: can't delete ${tableName} table because it does not exist`);
    }
    throw e;
  }
  return tableName;    
}

async function createTable(tableName) {
  try {
    const params = JSON.parse(fs.readFileSync(`${schemaDirectory}${tableName}.json`));
    await dynamodb.createTable(params).promise();
    return tableName;

  } catch (e) {
    throw e;
  }  
}

async function loadData(tableName) {
  let items;
  try {
    console.log(`loading data for ${tableName}`);
    items = JSON.parse(fs.readFileSync(`${sampleDataDirectory}${tableName}.json`));
  } catch (e) {
    console.log(e);
    throw e;
  }

  const requestItem = {};
  requestItem[tableName] = [];
  let requests = [];

  items.forEach((current, index) => {
    requestItem[tableName].push({
      PutRequest: {
        Item: current
      }
    });

    if (index % 25 === 0) {
      requests.push(Object.assign({}, requestItem));
      requestItem[tableName] = [];
    }
  });

  if (requestItem[tableName].length > 0) {
    requests.push(requestItem);
  }

  for (const request of requests) {
    await doc.batchWrite({ RequestItems: request }).promise();
    console.log(`items saved for ${tableName}`);
  }
}
