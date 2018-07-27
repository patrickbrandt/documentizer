#! /bin/bash

docker-compose run --rm init
docker-compose run --rm documentize
docker-compose up api