import {getContracts, getSignature} from './utils';
import {StakingType, InvestmentStatus} from './registryEnums';
import {BASE_AMOUNT} from './constants';

import {deployments, ethers, getNamedAccounts, web3} from 'hardhat';
import chai, {expect} from 'chai';
import {BigNumber} from 'ethers';
const {expectRevert} = require('@openzeppelin/test-helpers');

// Allows Seeker publishes Investment
export const requestInvestment = async (
  investmentTokenContract: any,
  amountOfTokensToBePurchased: BigNumber,
  lendingTokenContract: any,
  totalAmountRequested: BigNumber,
  ipfsHash: any,
  seekerSigner: any
) => {
  const {registryContract} = await getContracts();

  const numberInvestmentBefore = await registryContract.totalInvestments();

  await registryContract
    .connect(seekerSigner)
    .requestInvestment(
      investmentTokenContract.address,
      amountOfTokensToBePurchased,
      lendingTokenContract.address,
      totalAmountRequested,
      ipfsHash
    );

  const numberInvestmentAfter = await registryContract.totalInvestments();

  expect(Number(numberInvestmentAfter)).to.be.equal(
    Number(numberInvestmentBefore) + 1
  );

  return numberInvestmentBefore;
};

// SuperGovernance decides if apporve Investment
export const handleInvestmentRequest = async (
  investmentId: BigNumber,
  superDelegatorSigner: any,
  approve: boolean
) => {
  const {registryContract, governanceContract} = await getContracts();

  const status = await registryContract.investmentStatus(investmentId);
  expect(String(status)).to.be.equal(String(InvestmentStatus.REQUESTED));

  await governanceContract
    .connect(superDelegatorSigner)
    .superVoteForRequest(investmentId, approve);

  const status2 = await registryContract.investmentStatus(investmentId);
  if (approve) {
    expect(String(status2)).to.be.equal(String(InvestmentStatus.APPROVED));
  } else {
    expect(String(status2)).to.be.equal(String(InvestmentStatus.REJECTED));
  }
};

// Funders stake
export const fundersStake = async (
  lender: any,
  lenderSigner: any,
  stakingLevel: StakingType
) => {
  const {stakingContract, ALBTContract, rALBTContract, stakerMedalNFTContract} =
    await getContracts();

  if (stakingLevel === StakingType.STAKER_LVL_0) {
    await expectRevert(
      stakingContract.connect(lenderSigner).stake(stakingLevel),
      'Cannot stake for type zero'
    );
  } else {
    // Given
    const stakerStakingAmountBefore = await stakingContract.getBalance(lender);

    const amountToStake = (
      await stakingContract.stakingTypeAmounts(stakingLevel)
    ).sub(stakerStakingAmountBefore);

    const stakerALBTBalanceBefore = await ALBTContract.balanceOf(lender);

    const stakingContractALBTBalanceBefore = await ALBTContract.balanceOf(
      stakingContract.address
    );

    const stakedSupplyBefore = await stakingContract.totalSupply();

    const rALBTBalanceBefore = await rALBTContract.balanceOf(lender);

    // When
    await expect(stakingContract.connect(lenderSigner).stake(stakingLevel))
      .to.emit(stakingContract, 'Staked')
      .withArgs(lender, amountToStake);

    const stakerStakingAmounAfter = await stakingContract.getBalance(lender);

    const stakedSupplyAfter = await stakingContract.totalSupply();
    const stakerALBTBalanceAfter = await ALBTContract.balanceOf(lender);

    const stakingContractALBTBalanceAfter = await ALBTContract.balanceOf(
      stakingContract.address
    );
    const rALBTBalanceAfter = await rALBTContract.balanceOf(lender);

    const levelOfStakerAfter = await stakerMedalNFTContract.getLevelOfStaker(
      lender
    );

    const balanceStakerMedal1 = await stakerMedalNFTContract.balanceOf(
      lender,
      1
    );
    const balanceStakerMedal2 = await stakerMedalNFTContract.balanceOf(
      lender,
      2
    );
    const balanceStakerMedal3 = await stakerMedalNFTContract.balanceOf(
      lender,
      3
    );

    // Then
    const expectedMedals = () => {
      switch (stakingLevel) {
        case StakingType.STAKER_LVL_1:
          return ['1', '0', '0'];
        case StakingType.STAKER_LVL_2:
          return ['0', '1', '0'];
        case StakingType.STAKER_LVL_3:
          return ['0', '0', '1'];
        default:
          return ['0', '0', '0'];
      }
    };

    expect(balanceStakerMedal1.toString()).to.be.equal(expectedMedals()[0]);
    expect(balanceStakerMedal2.toString()).to.be.equal(expectedMedals()[1]);
    expect(balanceStakerMedal3.toString()).to.be.equal(expectedMedals()[2]);

    expect(levelOfStakerAfter.toString()).to.be.equal(stakingLevel);

    expect(Number(stakerStakingAmounAfter)).to.be.greaterThan(
      Number(stakerStakingAmountBefore)
    );

    expect(Number(stakerALBTBalanceAfter)).to.be.equal(
      Number(stakerALBTBalanceBefore.sub(amountToStake))
    );

    expect(Number(stakingContractALBTBalanceAfter)).to.be.equal(
      Number(stakingContractALBTBalanceBefore.add(amountToStake))
    );

    expect(Number(stakedSupplyAfter)).to.be.equal(
      Number(stakedSupplyBefore.add(amountToStake))
    );
    expect(Number(rALBTBalanceAfter)).to.be.greaterThan(
      Number(rALBTBalanceBefore)
    );
  }
};

// Get RALBT with actions
export const getRALBTWithActions = async (
  lender: any,
  actionCallerSigner: any,
  deployerSigner: any
) => {
  const {actionVerifierContract, rALBTContract} = await getContracts();

  const rALBTBalanceBefore = await rALBTContract.balanceOf(lender);

  const addressZero = '0x0000000000000000000000000000000000000000';
  const actions = [
    {
      account: lender,
      actionName: 'Wallet Connect',
      answer: 'Yes',
      referralId: '0',
    },
  ];

  // Given
  const reputationalAlbtRewardsPerLevel = [
    ethers.utils.parseEther('1000').toString(),
    ethers.utils.parseEther('1000').toString(),
    ethers.utils.parseEther('1000').toString(),
    ethers.utils.parseEther('1000').toString(),
  ];

  const reputationalAlbtRewardsPerLevelAfterFirstTime = [
    ethers.utils.parseEther('10').toString(),
    ethers.utils.parseEther('10').toString(),
    ethers.utils.parseEther('10').toString(),
    ethers.utils.parseEther('10').toString(),
  ];

  await actionVerifierContract
    .connect(deployerSigner)
    .importAction(
      'Wallet Connect',
      reputationalAlbtRewardsPerLevel,
      reputationalAlbtRewardsPerLevelAfterFirstTime,
      2,
      addressZero
    );

  let signature = await getSignature(
    'Wallet Connect',
    'Yes',
    lender,
    0,
    actionVerifierContract.address,
    web3
  );

  const signatures = [signature];

  await actionVerifierContract
    .connect(actionCallerSigner)
    .provideRewardsForActions(actions, signatures);

  const rALBTBalanceAfter = await rALBTContract.balanceOf(lender);

  if (rALBTBalanceAfter.eq(rALBTBalanceBefore)) {
    console.log("Didn't get rALBT");
  } else {
    expect(Number(rALBTBalanceAfter)).to.be.greaterThan(
      Number(rALBTBalanceBefore)
    );
  }
};

// Funders declare their intention to buy a partition (effectively depositing their funds)
// IMPORTANT the lender needs to have more rALBT than rAlbtPerLotteryNumber
export const declareIntentionForBuy = async (
  investmentId: BigNumber,
  lender: any,
  lenderSigner: any,
  numberOfPartitions: BigNumber,
  lendingTokenContract: any
) => {
  const {escrowContract, registryContract, rALBTContract} =
    await getContracts();

  const rAlbtPerLotteryNumber = await registryContract.rAlbtPerLotteryNumber();
  const rALBTBalanceBefore = await rALBTContract.balanceOf(lender);

  if (rALBTBalanceBefore.gte(rAlbtPerLotteryNumber)) {
    const amountOfLendingTokens = numberOfPartitions.mul(
      ethers.utils.parseEther(BASE_AMOUNT + '')
    );
    const initLenderLendingTokenBalance = await lendingTokenContract.balanceOf(
      lender
    );

    const initEscrowLendingTokenBalance = await lendingTokenContract.balanceOf(
      escrowContract.address
    );

    await registryContract
      .connect(lenderSigner)
      .showInterestForInvestment(investmentId, numberOfPartitions);

    const lenderLendingTokenBalanceAfter = await lendingTokenContract.balanceOf(
      lender
    );

    const escrowLendingTokenBalanceAfter = await lendingTokenContract.balanceOf(
      escrowContract.address
    );

    expect(lenderLendingTokenBalanceAfter).to.be.equal(
      initLenderLendingTokenBalance.sub(amountOfLendingTokens)
    );

    expect(escrowLendingTokenBalanceAfter).to.be.equal(
      initEscrowLendingTokenBalance.add(amountOfLendingTokens)
    );
  } else {
    await expectRevert(
      registryContract
        .connect(lenderSigner)
        .showInterestForInvestment(investmentId, numberOfPartitions),
      'Not eligible for lottery numbers'
    );
  }
};

export const runLottery = async (
  governanceContract: any,
  superDelegatorSigner: any,
  registryContract: any,
  investmentId: number,
  lotteryRunnerSigner: any
) => {
  await governanceContract.connect(superDelegatorSigner).checkCronjobs();

  const investmentStatus = await registryContract.investmentStatus(
    investmentId
  );

  expect(investmentStatus).to.be.equal(2);

  await expect(
    registryContract
      .connect(lotteryRunnerSigner)
      .executeLotteryRun(investmentId)
  )
    .to.emit(registryContract, 'LotteryExecuted')
    .withArgs(investmentId);

  const ticketsRemainingAfter = await registryContract.ticketsRemaining(
    investmentId
  );
  console.log('ticketsRemainingAfter', ticketsRemainingAfter);
  expect(ticketsRemainingAfter.toNumber()).to.be.equal(0);
};
