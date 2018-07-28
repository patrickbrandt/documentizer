
Reference architecure example:

* Reshape relational data into document data
* Index content into ElasticSearch for full-text search

Usage:

* Initalize the relational data structure: ```docker-compose run --rm init```
* Convert to documents: ```docker-compose run --rm documentize```
* Start api: ```docker-compose up api```
  * accessible on the host via the docker host IP address: ```http://192.168.99.100:8080/```

These three commands are run in sequence when you execute ```./run.sh```

Dependancies:

* [Docker](https://docs.docker.com/install/#supported-platforms)
