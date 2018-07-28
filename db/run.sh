#!/bin/bash

cd ../shared
npm link
cd ../db
npm link shared
npm prune . && npm install . && node make_tables.js