import {task} from 'hardhat/config';
import '@nomiclabs/hardhat-ethers';

export const TASK_ACCOUNTS = task('accounts', 'Prints the list of accounts', async (args, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(await account.address);
  }
});

export const TASK_rALBT = task('rALBT', 'Gets rALBT token address', async (args, hre) => {
  const escrowContract = await hre.ethers.getContract('Escrow');
  const rALBTAddress = await escrowContract.reputationalALBT();
  console.log(rALBTAddress)
})

export const TASK_mintALBT = task('mint:ALBT', 'Mints ALBT tokens to address', async ({target, amount}, {ethers}) => {
  try {
    console.log(`Minting ${amount} ALBT to ${target}...`);
    const albt = await ethers.getContract('ALBT');
    await albt.mint(target, ethers.utils.parseEther(amount))
  } catch (error) {
    console.log(error.message)
  }  
}).addParam("target", "The address to mint to")
  .addParam("amount", "amount of ALBT to mint")

export const TASK_mintUSDC = task('mint:USDC', 'Mints USDC tokens (lending) to address', async ({target, amount}, {ethers}) => {
  try {
    console.log(`Minting ${amount} USDC to ${target}...`);
    const usdc = await ethers.getContract('LendingToken');
    await usdc.mint(target, ethers.utils.parseEther(amount))
  } catch (error) {
    console.log(error.message)
  }  
}).addParam("target", "The address to mint to")
  .addParam("amount", "amount of USDC to mint")

export const TASK_mint = task('mint:', 'Mints tokens to address', async ({target, amount, tokenName}, {ethers}) => {
  try {
    console.log(`Minting ${amount} ${tokenName} to ${target}...`);
    const token = await ethers.getContract(tokenName);
    await token.mint(target, ethers.utils.parseEther(amount))
  } catch (error) {
    console.log(error.message)
  }  
}).addParam("target", "The address to mint to")
  .addParam("amount", "amount to mint")
  .addParam("tokenName", "The token contract name")

export const TASK_addAction = task('add:Action', 'Add an action', async ({action, reputationalAlbtRewardsPerLevel, reputationalAlbtRewardsPerLevelAfterFirstTime, minimumLevelForProvision, referralContract}, {ethers}) => {
  try {
    const actionVerifier = await ethers.getContract('ActionVerifier');
    await actionVerifier.importAction(action, reputationalAlbtRewardsPerLevel, reputationalAlbtRewardsPerLevelAfterFirstTime, minimumLevelForProvision, referralContract)
  } catch (error) {
    console.log(error.message)
  }  
}).addParam("action", "The action name")
  .addParam("amount", "amount to mint")
  .addParam("tokenName", "The token contract name")  

export const TASK_superVote = task('superVoteForApprove', 'super Vote For Approve', async ({requestId, decision}, {ethers}) => {
  try {
    const superGovernance = await ethers.getContract('SuperGovernance');
    await superGovernance.superVoteForRequest(requestId, decision);
  } catch (error) {
    console.log(error.message)
  }  
}).addParam("requestId", "The request id")
  .addParam("decision", "The decision")  