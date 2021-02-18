const Registry = artifacts.require('Registry');
const Escrow = artifacts.require('Escrow');
const Governance = artifacts.require('Governance');
const Staking = artifacts.require('Staking');
const LendingToken = artifacts.require('LendingToken');
const CollateralToken = artifacts.require('CollateralToken');
const ALBT = artifacts.require('ALBT');
const LoanNFT = artifacts.require('LoanNFT');
const MainNFT = artifacts.require('MainNFT');

const {
  DAO_LOAN_APPROVAL,
  DAO_MILESTONE_APPROVAL,
  VESTING_TIME_INTERVAL,
  VESTING_BATCHES,
  BASE_AMOUNT,
  MINIMUM_INTEREST_PERCENTAGE,
  MAX_MILESTONES,
  MILESTONE_EXTENSION,
  AMOUNT_FOR_DAO_MEMBERSHIP
} = require("../tests/helpers/constants");

const BN = require("bn.js");
const { toWei } = require('web3-utils');

async function main() {
  const accounts = await web3.eth.getAccounts();

  this.owner = accounts[0];
  this.borrower = accounts[1];
  this.lenders = [accounts[2], accounts[3], accounts[4]];
  this.delegators = [accounts[5], accounts[6], accounts[7]];

  // Deploy contracts.
  this.albt = await ALBT.new();
  this.lendingToken = await LendingToken.new();
  this.collateralToken = await CollateralToken.new();
  this.loanNft = await LoanNFT.new();
  this.mainNft = await MainNFT.new();
  this.governance = await Governance.new(
    this.delegators,
    2,
    DAO_LOAN_APPROVAL,
    DAO_MILESTONE_APPROVAL,
    new BN(toWei(AMOUNT_FOR_DAO_MEMBERSHIP.toString()))
  );
  this.escrow = await Escrow.new(
    this.lendingToken.address,
    this.mainNft.address,
    this.loanNft.address
  );
  this.staking = await Staking.new(
    this.albt.address,
    this.albt.address
  );
  this.registry = await Registry.new(
    this.escrow.address,
    this.governance.address,
    this.lendingToken.address,
    this.mainNft.address,
    this.loanNft.address,
    new BN(toWei(BASE_AMOUNT.toString())),
    MINIMUM_INTEREST_PERCENTAGE,
    MAX_MILESTONES,
    MILESTONE_EXTENSION,
    VESTING_BATCHES,
    VESTING_TIME_INTERVAL
  );

  // Initialize contracts.
  await this.governance.initialize(this.registry.address);
  await this.escrow.initialize(this.registry.address);

  // Add roles.
  await this.loanNft.grantRole(web3.utils.keccak256('MINTER_ROLE'), this.registry.address, { from: this.owner });
  await this.loanNft.grantRole(web3.utils.keccak256('PAUSER_ROLE'), this.registry.address, { from: this.owner });

  // Deployment
  console.log("\nDEPLOYMENTS\n")
  console.log("\tALBT:", this.albt.address);
  console.log("\tLoan NFT:", this.loanNft.address);
  console.log("\tGovernance:", this.governance.address);
  console.log("\tEscrow:", this.escrow.address);
  console.log("\tStaking:", this.staking.address);
  console.log("\tRegistry", this.registry.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
