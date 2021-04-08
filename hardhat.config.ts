import { resolve } from "path";
require("dotenv").config();

import { HardhatUserConfig, task } from "hardhat/config";
import { NetworkUserConfig } from "hardhat/types";

import "@nomiclabs/hardhat-truffle5";
import "hardhat-gas-reporter";
import "hardhat-typechain";

import BN from 'bn.js';
import { toWei } from 'web3-utils';
import { ONE_DAY } from "./tests/helpers/constants";
import { getCurrentTimestamp } from "./tests/helpers/time";
import { LoanStatus } from "./tests/helpers/registryEnums";

if (!process.env.RINKEBY_PRIVKEY) throw new Error("RINKEBY_PRIVKEY missing from .env file");
if (!process.env.MAINNET_PRIVKEY) throw new Error("MAINNET_PRIVKEY missing from .env file");

task("requestProjectLoanToFund", "Requests a project loan ready to get funded using a registry contract", async (taskArgs, env) => {
  const Registry = env.artifacts.require("Registry");
  const CollateralToken = env.artifacts.require("CollateralToken");
  const Governance = env.artifacts.require("Governance");

  if (!process.env.REGISTRY_ADDRESS) throw new Error("REGISTRY_ADDRESS missing from .env file");
  if (!process.env.COLLATERAL_TOKEN_ADDRESS) throw new Error("COLLATERAL_TOKEN_ADDRESS missing from .env file");
  if (!process.env.GOVERNANCE_ADDRESS) throw new Error("GOVERNANCE_ADDRESS missing from .env file");
  if (!process.env.LOAN_REQUEST_TOTAL_MILESTONES) throw new Error("LOAN_REQUEST_TOTAL_MILESTONES missing from .env file");
  if (!process.env.LOAN_REQUEST_AMOUNT_PER_MILESTONE) throw new Error("LOAN_REQUEST_AMOUNT_PER_MILESTONE missing from .env file");
  if (!process.env.LOAN_REQUEST_DAYS_PER_MILESTONE) throw new Error("LOAN_REQUEST_DAYS_PER_MILESTONE missing from .env file");
  //if (!process.env.LOAN_REQUEST_IPFS_HASH) throw new Error("LOAN_REQUEST_IPFS_HASH missing from .env file");

  const registryContract = await Registry.at(process.env.REGISTRY_ADDRESS);
  const collateralTokenContract = await CollateralToken.at(process.env.COLLATERAL_TOKEN_ADDRESS);
  const governanceContract = await Governance.at(process.env.GOVERNANCE_ADDRESS);

  const accounts = await env.web3.eth.getAccounts();
  const borrower1 = accounts[1];
  const delegators = [accounts[5], accounts[6], accounts[7]];

  const loanId = new BN(await registryContract.totalLoans());
  const approvalRequest = new BN(await governanceContract.totalApprovalRequests());
  const totalMilestones = new BN(process.env.LOAN_REQUEST_TOTAL_MILESTONES);
  let milestoneDurations = new Array<BN>(totalMilestones);
  let amountRequestedPerMilestone = new Array<BN>(totalMilestones);
  const currentTime = await getCurrentTimestamp();
  const amountCollateralized = new BN(toWei("100000"));
  const interestPercentage = new BN(20);
  const timeDiffBetweenDeliveryAndRepayment = new BN(3600);
  const ipfsHash = process.env.LOAN_REQUEST_IPFS_HASH;

  for (let i = 0; i < Number(totalMilestones); i++) {
    milestoneDurations[i] = currentTime.add(new BN(parseInt(process.env.LOAN_REQUEST_DAYS_PER_MILESTONE) * ONE_DAY))
    amountRequestedPerMilestone[i] = new BN(toWei(process.env.LOAN_REQUEST_AMOUNT_PER_MILESTONE));
  }

  await registryContract.requestProjectLoan(
    amountRequestedPerMilestone,
    collateralTokenContract.address,
    amountCollateralized.toString(),
    interestPercentage,
    totalMilestones,
    milestoneDurations,
    timeDiffBetweenDeliveryAndRepayment,
    ipfsHash,
    { from: borrower1 }
  );

  await governanceContract.voteForRequest(approvalRequest, true, { from: delegators[0] });
  await governanceContract.voteForRequest(approvalRequest, true, { from: delegators[1] });

  const loanStatus = await registryContract.loanStatus(loanId);
  if (loanStatus == LoanStatus.APPROVED) {
    console.log("Requested and approved loan with ID", loanId);
  }
});

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      // forking: {
      //   url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
      //   blockNumber: 11589707,
      // },
    },
    ganache: {
      url: "http://localhost:8545",
    },
    rinkeby: {
      url: `https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
      accounts: [process.env.RINKEBY_PRIVKEY],
    },
    live: {
      url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
      accounts: [process.env.MAINNET_PRIVKEY],
    },
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./tests",
  },
  solidity: {
    version: "0.7.0",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  gasReporter: {
    currency: "USD",
    gasPrice: 120,
    enabled: true,
    coinmarketcap: process.env.CMC_API_KEY,
  },
  typechain: {
    outDir: "types/contracts",
    target: "truffle-v5"
  },
};

export default config;
