import {HardhatUserConfig} from 'hardhat/types';
import 'hardhat-deploy';
import '@nomiclabs/hardhat-ethers';
import 'hardhat-gas-reporter';
import '@typechain/hardhat';
import 'solidity-coverage';

import {node_url, accounts} from './utils/network';

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      // forking: {
      //   url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
      //   blockNumber: 11589707,
      // },
      live: false,
      saveDeployments: true,
      tags: ['local', 'test'],
    },
    ganache: {
      url: node_url('localhost'),
      live: false,
      saveDeployments: true,
      tags: ['local'],
      accounts: accounts('localhost'),
    },
    rinkeby: {
      url: node_url('rinkeby'),
      live: true,
      saveDeployments: true,
      tags: ['staging'],
      accounts: accounts('rinkeby'),
    },
    mainnet: {
      url: node_url('mainnet'),
      live: true,
      saveDeployments: true,
      tags: ['production'],
      accounts: accounts('mainnet'),
    },
    fork: {
      url: node_url('fork'),
    },
  },
  namedAccounts: {
    deployer: 0,
    proxyOwner: 1,
    delegator1: 2,
    delegator2: 3,
    staker1: 4,
    staker2: 5,
    rewardDistributor: 6,
    lender1: 7,
    lender2: 8,
    seeker: 9,
  },
  paths: {
    artifacts: './artifacts',
    cache: './cache',
    sources: './contracts',
    tests: './test',
  },
  solidity: {
    version: '0.7.3',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  gasReporter: {
    currency: 'USD',
    gasPrice: 120,
    enabled: true,
    coinmarketcap: process.env.CMC_API_KEY,
  },
  typechain: {
    outDir: 'types/contracts',
    target: 'ethers-v5',
  },
  mocha: {
    timeout: 0,
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || '',
  },
};

export default config;
