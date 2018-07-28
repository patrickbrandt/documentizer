#!/bin/bash

cd ../shared
npm link
cd ../documentize
npm link shared
npm prune . && npm install . && npm run documentize