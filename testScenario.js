'use strict';
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
const {execSync} = require('child_process');
const {readdirSync} = require('fs');
const folder = process.argv[2];
const subfolder = process.argv[3];
const entryPoint = process.argv[4] || 'index.spec.ts';

// add more folders here when we create test cases for more project types
const tests = ['investment'];

const getTestsToRun = (tests) => {
  commandString = `yarn test `;
  tests.forEach((test) => {
    const subdirs = readdirSync(
      require('path').resolve(__dirname, 'tests', 'scenarios', test),
      {withFileTypes: true}
    )
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    subdirs.forEach((subdir) => {
      commandString += `./tests/scenarios/${test}/${subdir}/index.spec.ts `;
    });
  });
};

// warn about errors
if (!folder || (folder && subfolder && !tests.includes(folder))) {
  console.error(
    `Invalid arguments.\n
    Input the name of the folder you want to run, and optionally subfolder and the entry point\n
    Example input\n 
    yarn test:scenario investment [happyPath] [index.spec.ts]`
  );
  process.exit();
}
// final command string to run
let commandString = `yarn test ./tests/scenarios/${folder}/${subfolder}/${entryPoint}`;

// if folder == all, run all test scenarios
if (folder.toLowerCase() === 'all') {
  getTestsToRun(tests);
}

// if folder == one of the tests, run only those
if (tests.includes(folder) && !subfolder) {
  getTestsToRun([folder]);
}

execSync(commandString, {
  stdio: [0, 1, 2],
});
