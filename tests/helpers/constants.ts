import {ethers} from 'hardhat';

export const DAO_INVESTMENT_APPROVAL_REQUEST_DURATION = 2 * 24 * 60 * 60; // Two days
export const DAO_MILESTONE_APPROVAL_REQUEST_DURATION = 24 * 60 * 60; // One day
export const DAO_UPDATE_REQUEST_DURATION = 24 * 60 * 60; // One day
export const DAO_APPROVALS_NEEDED_FOR_INVESTMENT_REQUEST = 1;
export const DAO_APPROVALS_NEEDED_FOR_GOVERNANCE_REQUEST = 1;

export const VESTING_TIME_INTERVAL = 30 * 24 * 60 * 60; // One month
export const VESTING_BATCHES = 4; // vesting batches : 4
export const BASE_AMOUNT = 10; // 10 tokens
export const MINIMUM_INTEREST_PERCENTAGE = 0; // 0% minimum interest
export const MAX_MILESTONES = 4; // max milestones : 4
export const MILESTONE_EXTENSION = 15 * 24 * 60 * 60; // Half month
export const ONE_DAY = 24 * 60 * 60; // ONE DAY
export const AMOUNT_FOR_DAO_MEMBERSHIP = 10000; // 10000 tokens
export const FUNDING_TIME_INTERVAL = 2 * 24 * 60 * 60; // Two days
export const APPLICATION_FOR_INVESTMENT_DURATION = 24 * 60 * 60; // ONE DAY
export const LATE_APPLICATION_FOR_INVESTMENT_DURATION = 24 * 60 * 60; // ONE DAY

// Actions
export const RALBT_REWARDS_PER_LEVEL = [
  ethers.utils.parseEther('0'),
  ethers.utils.parseEther('500'),
  ethers.utils.parseEther('500'),
  ethers.utils.parseEther('500'),
];
export const RALBT_REWARDS_PER_LEVEL_AFTER_FIRST_TIME = [
  ethers.utils.parseEther('0'),
  ethers.utils.parseEther('10'),
  ethers.utils.parseEther('10'),
  ethers.utils.parseEther('10'),
];

// These 2 are used to give non stakers some RALBT for testing purposes, hence the reward values
export const TEST_RALBT_REWARDS_PER_LEVEL = [
  ethers.utils.parseEther('500'),
  ethers.utils.parseEther('500'),
  ethers.utils.parseEther('500'),
  ethers.utils.parseEther('500'),
];
export const TEST_RALBT_REWARDS_PER_LEVEL_AFTER_FIRST_TIME = [
  ethers.utils.parseEther('10'),
  ethers.utils.parseEther('10'),
  ethers.utils.parseEther('10'),
  ethers.utils.parseEther('10'),
];