'use strict';
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
const execSync = require('child_process').execSync;
const folder = process.argv[2];
const file = process.argv[3] || 'index.spec.ts';

if (!folder) {
  console.error("Invalid arguments.");
  console.error("Input the name of the folder you want to run, and optionally the entry point if it's not index.spec.ts")
  console.error("Correct input: yarn test:scenario happyPath [index.spec.ts]")
  process.exit();
}

console.log(`hardhat test ./tests/scenarios/${folder}/${file}`);
execSync(`hardhat test ./tests/scenarios/${folder}/${file}`, {
  stdio: [0, 1, 2],
});
