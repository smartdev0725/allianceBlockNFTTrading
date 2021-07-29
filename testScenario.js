'use strict';
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
const execSync = require('child_process').execSync;
const folder = process.argv[2];
const file = process.argv[3] || 'index.spec.ts';

console.log(`hardhat test ./tests/scenarios/${folder}/${file}`);
execSync(`hardhat test ./tests/scenarios/${folder}/${file}`, {stdio:[0, 1, 2]});
