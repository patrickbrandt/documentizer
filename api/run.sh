cd ../shared
npm link
cd ../api
npm link shared
npm prune . && npm install . && npm run start