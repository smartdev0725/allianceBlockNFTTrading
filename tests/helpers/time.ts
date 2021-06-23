const {time} = require('@openzeppelin/test-helpers');
import {ethers} from 'hardhat';
import {BigNumber} from 'ethers';

export const getTransactionTimestamp = async (txHash: string) => {
  const blockNumber = (await ethers.provider.getTransaction(txHash))
    .blockNumber;

  if (blockNumber == null) return BigNumber.from(0);

  const timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp;

  return BigNumber.from(timestamp);
};

export const getCurrentTimestamp = async () => {
  const now = await time.latest();
  return now;
};

export const advanceTime = async (provider: any, seconds: number) => {
  await provider.send('evm_increaseTime', [seconds]);
};

export const advanceBlock = async (provider: any) => {
  await provider.send('evm_mine');
};

export const advanceMultipleBlocks = async (
  provider: any,
  numOfBlocks: number
) => {
  for (let i = 0; i < numOfBlocks; i++) {
    await provider.send('evm_mine');
  }
};

export const increaseTime = async (provider: any, seconds: number) => {
  await advanceBlock(provider);
  await advanceTime(provider, seconds);
};
