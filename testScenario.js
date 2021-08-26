'use strict';
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
const {execSync} = require('child_process');
const {readdirSync} = require('fs');
let folder = process.argv[2];
const file = process.argv[3] || 'index.spec.ts';

if (!folder) {
  console.error('Invalid arguments.');
  console.error(
    "Input the name of the folder you want to run, and optionally the entry point if it's not index.spec.ts"
  );
  console.error('Correct input: yarn test:scenario happyPath [index.spec.ts]');
  process.exit();
}

let commandString = `yarn test ./tests/scenarios/${folder}/${file}`;

if (folder.toLowerCase() === 'all' || folder === '*') {
  const dirs =  readdirSync(require('path').resolve(__dirname, 'tests', 'scenarios'), { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name)
  
  commandString = `yarn test `;
  dirs.forEach( dir => {
    commandString += `./tests/scenarios/${dir}/index.spec.ts `;
  })
}

execSync(commandString, {
  stdio: [0, 1, 2]
});
