import {getContracts, getSignature} from './utils';
import {StakingType, InvestmentStatus} from './registryEnums';
import {BASE_AMOUNT} from './constants';

import {
  Investment,
  InvestmentRequest,
  Stake,
  GetRALBTData,
  ShowInterestData,
  RunLotteryData,
  FunderClaimRewardData,
  ExchangeNFTForInvestmentTokenData,
} from './interfaces';

import {deployments, ethers, getNamedAccounts, web3} from 'hardhat';
import chai, {expect} from 'chai';
import {BigNumber} from 'ethers';
import {increaseTime} from './time';
const {expectRevert} = require('@openzeppelin/test-helpers');

// Allows Seeker publishes Investment
export const requestInvestment = async (
  investment: Investment
  // investmentTokenContract: any,
  // amountOfTokensToBePurchased: BigNumber,
  // lendingTokenContract: any,
  // totalAmountRequested: BigNumber,
  // ipfsHash: any,
  // seekerSigner: any
): Promise<BigNumber> => {
  const {
    investmentTokenContract,
    amountOfTokensToBePurchased,
    lendingTokenContract,
    totalAmountRequested,
    ipfsHash,
    seekerSigner,
  } = investment;
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
export const batchRequestInvestment = async (
  investments: Investment[]
): Promise<BigNumber[]> => {
  const investmetsId: BigNumber[] = [];

  for (let index = 0; index < investments.length; index++) {
    const investment = investments[index];
    const investmentId = await requestInvestment({
      investmentTokenContract: investment.investmentTokenContract,
      amountOfTokensToBePurchased: investment.amountOfTokensToBePurchased,
      lendingTokenContract: investment.lendingTokenContract,
      totalAmountRequested: investment.totalAmountRequested,
      ipfsHash: investment.ipfsHash,
      seekerSigner: investment.seekerSigner,
    });
    investmetsId.push(investmentId);
  }
  expect(investmetsId.length).to.be.equal(investments.length);
  return investmetsId;
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

export const batchHandleInvestmentRequest = async (
  investmentsForApprove: any[],
  superDelegatorSigner: any
) => {
  const results = [];
  // investmentForApprove = {investmentId: BigNumber, approve: Bool}
  for (let index = 0; index < investmentsForApprove.length; index++) {
    const investment = investmentsForApprove[index];
    await handleInvestmentRequest(
      investment.investmentId,
      superDelegatorSigner,
      investment.approve
    );
  }
};

// Funders stake
export const fundersStake = async (
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
    const stakerStakingAmountBefore = await stakingContract.getBalance(
      lenderSigner.address
    );

    const amountToStake = (
      await stakingContract.stakingTypeAmounts(stakingLevel)
    ).sub(stakerStakingAmountBefore);

    const stakerALBTBalanceBefore = await ALBTContract.balanceOf(
      lenderSigner.address
    );

    const stakingContractALBTBalanceBefore = await ALBTContract.balanceOf(
      stakingContract.address
    );

    const stakedSupplyBefore = await stakingContract.totalSupply();

    const rALBTBalanceBefore = await rALBTContract.balanceOf(
      lenderSigner.address
    );

    // When
    await expect(stakingContract.connect(lenderSigner).stake(stakingLevel))
      .to.emit(stakingContract, 'Staked')
      .withArgs(lenderSigner.address, amountToStake);

    const stakerStakingAmounAfter = await stakingContract.getBalance(
      lenderSigner.address
    );

    const stakedSupplyAfter = await stakingContract.totalSupply();
    const stakerALBTBalanceAfter = await ALBTContract.balanceOf(
      lenderSigner.address
    );

    const stakingContractALBTBalanceAfter = await ALBTContract.balanceOf(
      stakingContract.address
    );
    const rALBTBalanceAfter = await rALBTContract.balanceOf(
      lenderSigner.address
    );

    const levelOfStakerAfter = await stakerMedalNFTContract.getLevelOfStaker(
      lenderSigner.address
    );

    const balanceStakerMedal1 = await stakerMedalNFTContract.balanceOf(
      lenderSigner.address,
      1
    );
    const balanceStakerMedal2 = await stakerMedalNFTContract.balanceOf(
      lenderSigner.address,
      2
    );
    const balanceStakerMedal3 = await stakerMedalNFTContract.balanceOf(
      lenderSigner.address,
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

export const batchFundersStake = async (data: any[]) => {
  //  data = {lenderSigner: any, stakingLevel: StakingType}
  for (let i = 0; i < data.length; i++) {
    await fundersStake(data[i].lenderSigner, data[i].stakingLevel);
  }
};

// Get RALBT with actions
export const getRALBTWithActions = async (
  lenderSigner: any,
  actionCallerSigner: any,
  deployerSigner: any
) => {
  const {actionVerifierContract, rALBTContract} = await getContracts();

  const rALBTBalanceBefore = await rALBTContract.balanceOf(
    lenderSigner.address
  );

  const addressZero = '0x0000000000000000000000000000000000000000';
  const actions = [
    {
      account: lenderSigner.address,
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
    lenderSigner.address,
    0,
    actionVerifierContract.address,
    web3
  );

  const signatures = [signature];

  await actionVerifierContract
    .connect(actionCallerSigner)
    .provideRewardsForActions(actions, signatures);

  const rALBTBalanceAfter = await rALBTContract.balanceOf(lenderSigner.address);

  if (rALBTBalanceAfter.eq(rALBTBalanceBefore)) {
    console.log("Didn't get rALBT");
  } else {
    expect(Number(rALBTBalanceAfter)).to.be.greaterThan(
      Number(rALBTBalanceBefore)
    );
  }
};
export const batchGetRALBTWithActions = async (
  data: any[],
  deployerSigner: any
) => {
  //  data = {lenderSigner: any, actionCallerSigner: any}
  for (let i = 0; i < data.length; i++) {
    await increaseTime(deployerSigner.provider, 1 * 24 * 60 * 60); // 1 day
    await getRALBTWithActions(
      data[i].lenderSigner,
      data[i].actionCallerSigner,
      deployerSigner
    );
  }
};

// Funders declare their intention to buy a partition (effectively depositing their funds)
// IMPORTANT the lenderSigner.address needs to have more rALBT than rAlbtPerLotteryNumber
export const declareIntentionForBuy = async (
  investmentId: BigNumber,
  lenderSigner: any,
  numberOfPartitions: BigNumber,
  lendingTokenContract: any
) => {
  const {escrowContract, registryContract, rALBTContract} =
    await getContracts();

  const rAlbtPerLotteryNumber = await registryContract.rAlbtPerLotteryNumber();
  const rALBTBalanceBefore = await rALBTContract.balanceOf(
    lenderSigner.address
  );

  if (rALBTBalanceBefore.gte(rAlbtPerLotteryNumber)) {
    const amountOfLendingTokens = numberOfPartitions.mul(
      ethers.utils.parseEther(BASE_AMOUNT + '')
    );
    const initLenderLendingTokenBalance = await lendingTokenContract.balanceOf(
      lenderSigner.address
    );
    const initEscrowLendingTokenBalance = await lendingTokenContract.balanceOf(
      escrowContract.address
    );

    await registryContract
      .connect(lenderSigner)
      .showInterestForInvestment(investmentId, numberOfPartitions);

    const lenderLendingTokenBalanceAfter = await lendingTokenContract.balanceOf(
      lenderSigner.address
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
export const batchDeclareIntentionForBuy = async (data: any[]) => {
  // data = {
  //   investmentId: BigNumber,
  //   lenderSigner: any,
  //   numberOfPartitions: BigNumber,
  //   lendingTokenContract: any,
  // };
  for (let i = 0; i < data.length; i++) {
    await declareIntentionForBuy(
      data[i].investmentId,
      data[i].lenderSigner,
      data[i].numberOfPartitions,
      data[i].lendingTokenContract
    );
  }
};

// The lottery is run when all the partitions have been covered
export const runLottery = async (
  investmentId: BigNumber,
  lotteryRunnerSigner: any,
  superDelegatorSigner: any
) => {
  const {registryContract, governanceContract} = await getContracts();

  await governanceContract.connect(superDelegatorSigner).checkCronjobs();
  await governanceContract.connect(superDelegatorSigner).checkCronjobs();

  const investmentStatus = await registryContract.investmentStatus(
    investmentId
  );
  const ticketsRemainingBefore = await registryContract.ticketsRemaining(
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

  expect(ticketsRemainingAfter.toNumber()).to.be.lessThan(
    ticketsRemainingBefore.toNumber()
  );
  return ticketsRemainingAfter;
};
export const batchRunLottery = async (
  data: any[],
  superDelegatorSigner: any
) => {
  // data = {
  //   investmentId: BigNumber,
  //   lotteryRunnerSigner: any,
  // };
  for (let i = 0; i < data.length; i++) {
    await runLottery(
      data[i].investmentId,
      data[i].lotteryRunnerSigner,
      superDelegatorSigner
    );
  }
};

// FundingNFTs are minted and each Funder either receives their NFT or their funds back in case they did not win the lottery
export const funderClaimLotteryReward = async (
  investmentId: BigNumber,
  lenderSigner: any,
  lendingTokenContract: any
) => {
  const {registryContract, fundingNFTContract} = await getContracts();

  const ticketsRemaining = await registryContract.ticketsRemaining(
    investmentId
  );

  if (ticketsRemaining.toNumber() === 0) {
    const ticketsWonBefore = await registryContract.ticketsWonPerAddress(
      investmentId,
      lenderSigner.address
    );
    const ticketsRemainBefore =
      await registryContract.remainingTicketsPerAddress(
        investmentId,
        lenderSigner.address
      );

    const balanceFundingNFTTokenBefore = await fundingNFTContract.balanceOf(
      lenderSigner.address,
      investmentId.toNumber()
    );

    const lenderLendingTokenBalanceBeforeWithdraw =
      await lendingTokenContract.balanceOf(lenderSigner.address);

    if (Number(ticketsWonBefore) > 0) {
      await expect(
        registryContract
          .connect(lenderSigner)
          .withdrawInvestmentTickets(
            investmentId,
            1,
            Number(ticketsWonBefore) - 1
          )
      )
        .to.emit(registryContract, 'WithdrawInvestment')
        .withArgs(investmentId, 1, Number(ticketsWonBefore) - 1);

      await expectRevert(
        registryContract
          .connect(lenderSigner)
          .withdrawAmountProvidedForNonWonTickets(investmentId),
        'No non-won tickets to withdraw'
      );
    }

    const ticketsAfter = await registryContract.ticketsWonPerAddress(
      investmentId,
      lenderSigner.address
    );

    expect(ticketsAfter.toNumber()).to.be.equal(0);

    const balanceFundingNFTTokenAfter = await fundingNFTContract.balanceOf(
      lenderSigner.address,
      investmentId.toNumber()
    );

    if (Number(ticketsWonBefore) > 0) {
      expect(balanceFundingNFTTokenAfter).to.be.gt(
        balanceFundingNFTTokenBefore
      );
    }

    const lenderLendingTokenBalanceAfterWithdraw =
      await lendingTokenContract.balanceOf(lenderSigner.address);

    expect(lenderLendingTokenBalanceAfterWithdraw).to.be.equal(
      lenderLendingTokenBalanceBeforeWithdraw.add(
        ethers.utils.parseEther(BASE_AMOUNT + '').mul(ticketsRemainBefore)
      )
    );
  } else {
    console.log('There are tickets remaining', ticketsRemaining.toNumber());
    throw new Error('There are tickets reamining');
  }
};
export const batchFunderClaimLotteryReward = async (data: any[]) => {
  // data = {
  //   investmentId: BigNumber,
  //   lenderSigner: any,
  //   lendingTokenContract:any
  // };
  for (let i = 0; i < data.length; i++) {
    await funderClaimLotteryReward(
      data[i].investmentId,
      data[i].lenderSigner,
      data[i].lendingTokenContract
    );
  }
};

//Funders with a FundingNFT exchange it for their Investment tokens.
export const exchangeNFTForInvestmentToken = async (
  investmentId: BigNumber,
  lenderSigner: any,
  investmentTokenContract: any
) => {
  const {registryContract, fundingNFTContract} = await getContracts();

  const balanceFundingNFTTokenAfter = await fundingNFTContract.balanceOf(
    lenderSigner.address,
    investmentId.toNumber()
  );

  const investmentTokensPerTicket =
    await registryContract.investmentTokensPerTicket(investmentId);

  const balanceOfInvestmentTokenBefore =
    await investmentTokenContract.balanceOf(lenderSigner.address);

  if (balanceFundingNFTTokenAfter.toNumber() > 0) {
    await expect(
      registryContract
        .connect(lenderSigner)
        .convertNFTToInvestmentTokens(investmentId, balanceFundingNFTTokenAfter)
    )
      .to.emit(registryContract, 'ConvertNFTToInvestmentTokens')
      .withArgs(
        investmentId,
        balanceFundingNFTTokenAfter,
        investmentTokensPerTicket.mul(balanceFundingNFTTokenAfter)
      );
  }

  expect(
    await fundingNFTContract.balanceOf(
      lenderSigner.address,
      investmentId.toNumber()
    )
  ).to.be.equal(0);

  const balanceOfInvestmentTokenAfter = await investmentTokenContract.balanceOf(
    lenderSigner.address
  );

  expect(balanceOfInvestmentTokenAfter.toString()).to.be.equal(
    balanceOfInvestmentTokenBefore.add(
      ethers.utils.parseEther('50').mul(balanceFundingNFTTokenAfter).toString()
    )
  );
};
export const batchExchangeNFTForInvestmentToken = async (data: any[]) => {
  // data = {
  //   investmentId: BigNumber,
  //   lenderSigner: any,
  //   investmentTokenContract:any
  // };
  for (let i = 0; i < data.length; i++) {
    await exchangeNFTForInvestmentToken(
      data[i].investmentId,
      data[i].lenderSigner,
      data[i].investmentTokenContract
    );
  }
};
