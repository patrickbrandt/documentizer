
Reference architecure example:

* Reshape relational data into document data
* Index content into ElasticSearch for full-text search

Usage:

* Initalize the relational data structure: ```docker-compose run --rm init```
* Convert to documents: ```docker-compose run --rm documentize```
* Run api: ```docker-compose up api```

These three commands are run in sequence when you execute ```run.sh```

Dependancies:

* [Docker](https://docs.docker.com/install/#supported-platforms)
