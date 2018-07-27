const fs = require('fs');
const {Aws} = require('../shared');
const {promisify} = require('util');
const aws = new Aws(process.env.DYNAMODB_ENDPOINT);

const schemaDirectory = process.env.SCHEMA_LOCATION || './tables/';
const sampleDataDirectory = process.env.DATA_LOCATION || './data/';
const dynamodb = aws.dynamodb;
const doc = aws.doc;
const readdirAsync = promisify(fs.readdir);

readdirAsync(schemaDirectory)
  .then(items => items.map(makeTable))
  .catch(err => console.log(err));

function makeTable(item){
  const table = item.split('.')[0];
  console.log(`making table ${table}`);
  deleteTable(table)
    .then(createTable)
    .then(loadData)
    .catch(err => console.log(err.stack));
}

function deleteTable(tableName) {
  return new Promise((resolve, reject) => {      
    dynamodb.deleteTable({ TableName: tableName }, (err, data) => {
      if (err && err.code === 'ResourceNotFoundException') {
        console.log(`WARN: can't delete ${tableName} table because it does not exist`);
      } else if (err) {
        return reject(err);
      }
      
      dynamodb.waitFor('tableNotExists', { TableName: tableName }).promise()
        .then(_ => resolve(tableName))
        .catch(err => reject(err))
    });        
  });
}

function createTable(tableName) {
  return new Promise((resolve, reject) => {
    let params;
    try {
      params = JSON.parse(fs.readFileSync(`${schemaDirectory}${tableName}.json`));
    } catch (err) {
      return reject(err);
    }

    dynamodb.createTable(params).promise()
      .then(_ => {
        return dynamodb.waitFor('tableExists', { TableName: tableName }).promise();
      })
      .then(_ => resolve(tableName))
      .catch(err => reject(err));
  });
}

function loadData(tableName) {
  let items;
  try {
    console.log(`loading data for ${tableName}`);
    items = JSON.parse(fs.readFileSync(`${sampleDataDirectory}${tableName}.json`));
  } catch (err) {
    return console.log(err);
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
      const copy = Object.assign({}, requestItem);
      copy[tableName] = requestItem[tableName].slice();
      requests.push(copy);
      requestItem[tableName] = [];
    }
  });

  if (requestItem[tableName].length > 0) {
    requests.push(requestItem);
  }

  requests.map((request) => {
    doc.batchWrite({ RequestItems: request }).promise()
      .then(_ => console.log(`items saved for ${tableName}`))
      .catch(err => console.log(`error in batch write for ${tableName}: ${err}`));
  });
}
