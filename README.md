# P2P Lending - Investment - NFT: Smart Contract

Smart contracts for the AllianceBlock Protocol.

## Table of Contents

<details>
<summary><strong>Expand</strong></summary>

- [Install](#install)
- [Usage](#usage)
- [Contributing](#contributing)

</details>


## Install

This repository requires some knowledge of:

* [Solidity](https://solidity.readthedocs.io/en/latest/)
* [yarn](https://yarnpkg.com/getting-started)
* [TypeScript](https://www.typescriptlang.org/) (for tests)
* [hardhat](https://hardhat.org/)

1. Install dependencies:

```bash
$ yarn
```

## Usage

```bash
# Lint
yarn lint
# Prettier
yarn format
# Compile contracts, export ABIs, and generate TypeScript interfaces
yarn compile
# Run tests
yarn dev
yarn test
# Deploy to hardhat network
yarn deploy hardhat
# Deploy specific contracts using tags
yarn deploy hardhat --tags v0.1.0
```


## Contributing

1. Fork it
2. Create your feature or fix branch (`git checkout -b feature/foo`)
3. Commit your changes (`git commit -am 'add something'`)
4. Push to the branch (`git push origin feature/foo`)
5. Create a new Pull Request
