import {getContracts, getSignature} from './utils';
import {StakingType, InvestmentStatus} from './registryEnums';
import {BASE_AMOUNT} from './constants';
import {Signer, Contract} from 'ethers';
import {
  Investment,
  InvestmentForApproval,
  Stake,
  GetRALBTData,
  ShowInterestData,
  RunLotteryData,
  FunderClaimRewardData,
  ExchangeNFTForInvestmentTokenData,
} from './interfaces';

import {ethers, web3} from 'hardhat';
import {expect} from 'chai';
import {BigNumber} from 'ethers';
import {getTransactionTimestamp, increaseTime} from './time';
import {CronjobType} from './governanceEnums';
const {expectRevert} = require('@openzeppelin/test-helpers');

//1) Allows Seeker publishes Investment
export const requestInvestment = async (
  investmentTokenContract: any,
  amountOfTokensToBePurchased: BigNumber,
  lendingTokenContract: any,
  totalAmountRequested: BigNumber,
  ipfsHash: any,
  seekerSigner: any
): Promise<BigNumber> => {
  const {
    registryContract,
    escrowContract,
    fundingNFTContract,
    governanceContract,
  } = await getContracts();

  const investmentId = await registryContract.totalInvestments();
  const totalInvestmentsBefore = await registryContract.totalInvestments();
  const balanceInvestmentTokenSeekerBefore =
    await investmentTokenContract.balanceOf(seekerSigner.address);
  const balanceInvestmentTokenEscrowBefore =
    await investmentTokenContract.balanceOf(escrowContract.address);
  const totalApprovalRequestsBefore =
    await governanceContract.totalApprovalRequests();

  const amountOfPartitions = totalAmountRequested.div(
    ethers.utils.parseEther(BASE_AMOUNT.toString())
  );
  // When
  const requestInvestment = await registryContract
    .connect(seekerSigner)
    .requestInvestment(
      investmentTokenContract.address,
      amountOfTokensToBePurchased,
      lendingTokenContract.address,
      totalAmountRequested,
      ipfsHash
    );

  const investmentDetails = await registryContract.investmentDetails(
    investmentId
  );
  const investmentSeeker = await registryContract.investmentSeeker(
    investmentId
  );
  const totalInvestmentsAfter = await registryContract.totalInvestments();
  const balanceInvestmentTokenSeekerAfter =
    await investmentTokenContract.balanceOf(seekerSigner.address);
  const balanceInvestmentTokenEscrowAfter =
    await investmentTokenContract.balanceOf(escrowContract.address);
  const balanceFundingNftEscrowAfter = await fundingNFTContract.balanceOf(
    escrowContract.address,
    investmentId
  );
  const investmentTokensPerTicket =
    await registryContract.investmentTokensPerTicket(investmentId);
  const isPauseFundingNFTTransfer = await fundingNFTContract.transfersPaused(
    investmentId
  );
  const totalApprovalRequestsAfter =
    await governanceContract.totalApprovalRequests();
  const approvalRequest = await governanceContract.approvalRequests(
    totalApprovalRequestsBefore
  );
  const investmentStatus = await registryContract.investmentStatus(
    investmentId
  );

  // Then
  // Events
  expect(requestInvestment)
    .to.emit(fundingNFTContract, 'TransfersPaused')
    .withArgs(investmentId);
  expect(requestInvestment)
    .to.emit(governanceContract, 'ApprovalRequested')
    .withArgs(investmentId, registryContract.address);
  expect(requestInvestment)
    .to.emit(registryContract, 'InvestmentRequested')
    .withArgs(investmentId, seekerSigner.address, totalAmountRequested);

  // Correct investment details
  expect(investmentDetails.investmentId).to.be.equal(investmentId);
  expect(investmentDetails.investmentToken).to.be.equal(
    investmentTokenContract.address
  );
  expect(investmentDetails.investmentTokensAmount).to.be.equal(
    amountOfTokensToBePurchased
  );
  expect(investmentDetails.totalAmountToBeRaised).to.be.equal(
    totalAmountRequested
  );
  expect(investmentDetails.extraInfo).to.be.equal(ipfsHash);
  expect(investmentDetails.totalPartitionsToBePurchased).to.be.equal(
    amountOfPartitions
  );
  expect(investmentDetails.lendingToken).to.be.equal(
    lendingTokenContract.address
  );
  // Correct investment seeker
  expect(investmentSeeker).to.be.equal(seekerSigner.address);
  // Correct total of investments
  expect(totalInvestmentsAfter.toNumber()).to.be.equal(
    totalInvestmentsBefore.toNumber() + 1
  );
  // Correct balances
  expect(balanceInvestmentTokenSeekerAfter).to.be.equal(
    balanceInvestmentTokenSeekerBefore.sub(amountOfTokensToBePurchased)
  );
  expect(balanceInvestmentTokenEscrowAfter).to.be.equal(
    balanceInvestmentTokenEscrowBefore.add(amountOfTokensToBePurchased)
  );
  expect(balanceFundingNftEscrowAfter).to.be.equal(amountOfPartitions);
  expect(investmentTokensPerTicket).to.be.equal(
    amountOfTokensToBePurchased.div(amountOfPartitions)
  );
  // Nft is pause
  expect(isPauseFundingNFTTransfer).to.be.true;
  // Correct approval request
  expect(approvalRequest.investmentId).to.be.equal(investmentId);
  expect(approvalRequest.approvalsProvided.toString()).to.be.equal('0');
  expect(approvalRequest.isApproved).to.be.false;
  expect(approvalRequest.isProcessed).to.be.false;
  expect(totalApprovalRequestsAfter.toNumber()).to.be.equal(
    totalApprovalRequestsBefore.toNumber() + 1
  );
  // Correct Status
  expect(String(investmentStatus)).to.be.equal(
    String(InvestmentStatus.REQUESTED)
  );
  return investmentId;
};
export const batchRequestInvestment = async (
  investments: Investment[]
): Promise<BigNumber[]> => {
  const investmetsId: BigNumber[] = [];

  for (let index = 0; index < investments.length; index++) {
    const investment = investments[index];
    const investmentId = await requestInvestment(
      investment.investmentTokenContract,
      investment.amountOfTokensToBePurchased,
      investment.lendingTokenContract,
      investment.totalAmountRequested,
      investment.ipfsHash,
      investment.seekerSigner
    );
    investmetsId.push(investmentId);
  }
  expect(investmetsId.length).to.be.equal(investments.length);
  return investmetsId;
};

//2) SuperGovernance decides if apporve Investment
export const handleInvestmentRequest = async (
  investmentId: BigNumber,
  superDelegatorSigner: any,
  approve: boolean
) => {
  // Given
  const {registryContract, governanceContract} = await getContracts();

  const investmentDetailsBeforeApprove =
    await registryContract.investmentDetails(investmentId);
  const totalApprovalRequestsBefore =
    await governanceContract.totalApprovalRequests();
  const totalCronjobsBeforeApprove = await governanceContract.totalCronjobs();
  const cronjobsListBeforeApprove = await governanceContract.cronjobList();

  // When
  const approveInvestment = await governanceContract
    .connect(superDelegatorSigner)
    .superVoteForRequest(investmentId, approve);

  const investmentStatusAfterApprove = await registryContract.investmentStatus(
    investmentId
  );
  const investmentDetailsAfterApprove =
    await registryContract.investmentDetails(investmentId);
  const ticketsRemainingAfterApprove = await registryContract.ticketsRemaining(
    investmentId
  );
  const totalCronjobsAfterApprove = await governanceContract.totalCronjobs();
  const cronjobsAfterApprove = await governanceContract.cronjobs(
    totalCronjobsAfterApprove
  );
  const cronjobsListAfterApprove = await governanceContract.cronjobList();
  const approvalRequestAfterApprove = await governanceContract.approvalRequests(
    investmentId
  );

  // Then
  // Events
  expect(approveInvestment)
    .to.emit(registryContract, 'InvestmentApproved')
    .withArgs(investmentId);
  expect(approveInvestment)
    .to.emit(governanceContract, 'VotedForRequest')
    .withArgs(investmentId, investmentId, true, superDelegatorSigner.address);

  // Correct investment status
  expect(String(investmentStatusAfterApprove)).to.be.equal(
    String(InvestmentStatus.APPROVED)
  );
  // Correct investment details
  expect(investmentDetailsAfterApprove.approvalDate).to.be.equal(
    await getTransactionTimestamp(approveInvestment.hash)
  );
  // Correct ticketsRemaining
  expect(ticketsRemainingAfterApprove).to.be.equal(
    investmentDetailsBeforeApprove.totalPartitionsToBePurchased
  );
  // Correct total of cronJobs
  expect(totalCronjobsAfterApprove).to.be.equal(
    totalCronjobsBeforeApprove.add(1)
  );
  // Correct cronJob
  expect(cronjobsAfterApprove.cronjobType.toString()).to.be.equal(
    CronjobType.INVESTMENT
  );
  expect(cronjobsAfterApprove.externalId).to.be.equal(investmentId);
  // Correct list of cronJob
  if (cronjobsListBeforeApprove.size.eq(0)) {
    expect(cronjobsListAfterApprove.head).to.be.equal(
      totalCronjobsAfterApprove
    );
    expect(cronjobsListAfterApprove.tail).to.be.equal(
      totalCronjobsAfterApprove
    );
  } else {
    expect(cronjobsListAfterApprove.head).to.be.equal(
      cronjobsListBeforeApprove.head
    );
    expect(cronjobsListAfterApprove.tail.toNumber()).to.be.equal(
      cronjobsListBeforeApprove.tail.add(1)
    );
  }
  expect(cronjobsListAfterApprove.size).to.be.equal(
    cronjobsListBeforeApprove.size.add(1)
  );

  // Correct approval request
  expect(approvalRequestAfterApprove.approvalsProvided).to.be.equal('1');
  expect(approvalRequestAfterApprove.isApproved).to.be.true;
  expect(approvalRequestAfterApprove.isProcessed).to.be.true;
};
export const batchHandleInvestmentRequest = async (
  investmentsForApprove: InvestmentForApproval[],
  superDelegatorSigner: Signer
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

//3) Funders stake
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
    const reputationalStakingTypeAmount =
      await stakingContract.reputationalStakingTypeAmounts(stakingLevel);

    const stakingTypeAmount = await stakingContract.stakingTypeAmounts(
      stakingLevel
    );
    const balanceALBTStakerBeforeStake = await ALBTContract.balanceOf(
      lenderSigner.address
    );
    const balanceALBTStakingContractBeforeStake = await ALBTContract.balanceOf(
      stakingContract.address
    );
    const totalSupplyBeforeStake = await stakingContract.totalSupply();

    const balanceStakingStakerBeforeStake = await stakingContract.getBalance(
      lenderSigner.address
    );

    const amountToStake = stakingTypeAmount.sub(
      balanceStakingStakerBeforeStake
    );
    // When
    await expect(stakingContract.connect(lenderSigner).stake(stakingLevel))
      .to.emit(stakingContract, 'Staked')
      .withArgs(lenderSigner.address, amountToStake);
    const balanceRALBTAfterStake = await rALBTContract.balanceOf(
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
    const balanceALBTStakerAfterStake = await ALBTContract.balanceOf(
      lenderSigner.address
    );
    const balanceALBTStakingContractAfterStake = await ALBTContract.balanceOf(
      stakingContract.address
    );
    const totalSupplyAfterStake = await stakingContract.totalSupply();

    const balanceStakingStakerAfterStake = await stakingContract.getBalance(
      lenderSigner.address
    );

    const levelOfStakerAfter = await stakerMedalNFTContract.getLevelOfStaker(
      lenderSigner.address
    );

    // Then
    // Correct rALBT balance
    expect(balanceRALBTAfterStake).to.be.equal(reputationalStakingTypeAmount);
    // Correct staker medal
    expect(balanceStakerMedal1).to.be.equal(expectedMedals()[0]);
    expect(balanceStakerMedal2).to.be.equal(expectedMedals()[1]);
    expect(balanceStakerMedal3).to.be.equal(expectedMedals()[2]);
    expect(levelOfStakerAfter).to.be.equal(stakingLevel);
    // Correct ALBT balance
    expect(balanceALBTStakerAfterStake).to.be.equal(
      balanceALBTStakerBeforeStake.sub(amountToStake)
    );
    expect(balanceALBTStakingContractAfterStake).to.be.equal(
      balanceALBTStakingContractBeforeStake.add(amountToStake)
    );
    // Correct total supply
    expect(totalSupplyAfterStake).to.be.equal(
      totalSupplyBeforeStake.add(amountToStake)
    );
    // Correct staking balance
    expect(balanceStakingStakerAfterStake).to.be.equal(
      balanceStakingStakerBeforeStake.add(amountToStake)
    );
  }
};

export const batchFundersStake = async (data: Stake[]) => {
  //  data = {lenderSigner: any, stakingLevel: StakingType}
  for (let i = 0; i < data.length; i++) {
    await fundersStake(data[i].lenderSigner, data[i].stakingLevel);
  }
};

// Get RALBT with actions
export const addNewAction = async (deployerSigner: any, action: any) => {
  // Given
  const {actionVerifierContract} = await getContracts();

  // Add new action
  // Given
  const addressZero = '0x0000000000000000000000000000000000000000';
  const reputationalAlbtRewardsPerLevel = [
    ethers.utils.parseEther('500').toString(),
    ethers.utils.parseEther('500').toString(),
    ethers.utils.parseEther('500').toString(),
    ethers.utils.parseEther('500').toString(),
  ];
  const reputationalAlbtRewardsPerLevelAfterFirstTime = [
    ethers.utils.parseEther('10').toString(),
    ethers.utils.parseEther('10').toString(),
    ethers.utils.parseEther('10').toString(),
    ethers.utils.parseEther('10').toString(),
  ];

  // Then
  await expect(
    actionVerifierContract
      .connect(deployerSigner)
      .importAction(
        action[0].actionName,
        reputationalAlbtRewardsPerLevel,
        reputationalAlbtRewardsPerLevelAfterFirstTime,
        2,
        addressZero
      )
  )
    .to.emit(actionVerifierContract, 'ActionImported')
    .withArgs(action[0].actionName);

  // Reward per action
  const rewardPerActionLevel0 =
    await actionVerifierContract.rewardPerActionPerLevel(
      web3.utils.keccak256(action[0].actionName),
      0
    );
  const rewardPerActionLevel1 =
    await actionVerifierContract.rewardPerActionPerLevel(
      web3.utils.keccak256(action[0].actionName),
      1
    );
  const rewardPerActionLevel2 =
    await actionVerifierContract.rewardPerActionPerLevel(
      web3.utils.keccak256(action[0].actionName),
      2
    );
  const rewardPerActionLevel3 =
    await actionVerifierContract.rewardPerActionPerLevel(
      web3.utils.keccak256(action[0].actionName),
      3
    );

  // Reward per action after first time
  const rewardPerActionPerLevelAfterFirstTime0 =
    await actionVerifierContract.rewardPerActionPerLevelAfterFirstTime(
      web3.utils.keccak256(action[0].actionName),
      0
    );
  const rewardPerActionPerLevelAfterFirstTime1 =
    await actionVerifierContract.rewardPerActionPerLevelAfterFirstTime(
      web3.utils.keccak256(action[0].actionName),
      1
    );
  const rewardPerActionPerLevelAfterFirstTime2 =
    await actionVerifierContract.rewardPerActionPerLevelAfterFirstTime(
      web3.utils.keccak256(action[0].actionName),
      2
    );
  const rewardPerActionPerLevelAfterFirstTime3 =
    await actionVerifierContract.rewardPerActionPerLevelAfterFirstTime(
      web3.utils.keccak256(action[0].actionName),
      3
    );

  const minimumLevelForActionProvision =
    await actionVerifierContract.minimumLevelForActionProvision(
      web3.utils.keccak256(action[0].actionName)
    );

  // Then
  // Correct reward per action
  expect(rewardPerActionLevel0.toString()).to.be.equal(
    reputationalAlbtRewardsPerLevel[0]
  );
  expect(rewardPerActionLevel1.toString()).to.be.equal(
    reputationalAlbtRewardsPerLevel[1]
  );
  expect(rewardPerActionLevel2.toString()).to.be.equal(
    reputationalAlbtRewardsPerLevel[2]
  );
  expect(rewardPerActionLevel3.toString()).to.be.equal(
    reputationalAlbtRewardsPerLevel[3]
  );
  // Correct reward per action after first time
  expect(rewardPerActionPerLevelAfterFirstTime0.toString()).to.be.equal(
    reputationalAlbtRewardsPerLevelAfterFirstTime[0]
  );
  expect(rewardPerActionPerLevelAfterFirstTime1.toString()).to.be.equal(
    reputationalAlbtRewardsPerLevelAfterFirstTime[1]
  );
  expect(rewardPerActionPerLevelAfterFirstTime2.toString()).to.be.equal(
    reputationalAlbtRewardsPerLevelAfterFirstTime[2]
  );
  expect(rewardPerActionPerLevelAfterFirstTime3.toString()).to.be.equal(
    reputationalAlbtRewardsPerLevelAfterFirstTime[3]
  );
  // Correct minimumLevelForActionProvision
  expect(minimumLevelForActionProvision.toString()).to.be.equal('2');
};

export const getRALBTWithActions = async (
  lenderSigner: any,
  actionCallerSigner: any,
  amountOfActions: any,
  actions: any
) => {
  const {actionVerifierContract, rALBTContract} = await getContracts();

  // Get rAlbt
  // Given
  const balanceRALBTBeforeActionsActionCaller = await rALBTContract.balanceOf(
    actionCallerSigner.address
  );
  const balanceRALBTBeforeActions = await rALBTContract.balanceOf(
    lenderSigner.address
  );
  const rewardPerActionProvisionPerLevel3 = await actionVerifierContract
    .connect(actionCallerSigner)
    .rewardPerActionProvisionPerLevel(StakingType.STAKER_LVL_3);

  const signature = await getSignature(
    actions[0].actionName,
    actions[0].answer,
    actions[0].account,
    actions[0].referralId,
    actionVerifierContract.address,
    web3
  );

  const signatures = [signature];

  // Then
  for (let i = 0; i < amountOfActions; i++) {
    await increaseTime(lenderSigner.provider, 1 * 24 * 60 * 60); // 1 day

    const provideRewardsForActions = await actionVerifierContract
      .connect(actionCallerSigner)
      .provideRewardsForActions(actions, signatures);

    expect(provideRewardsForActions).to.emit(
      actionVerifierContract,
      'ActionsProvided'
    );
    expect(provideRewardsForActions).to.emit(
      actionVerifierContract,
      'EpochChanged'
    );
  }

  const balanceRALBTAfterActionsActionCaller = await rALBTContract.balanceOf(
    actionCallerSigner.address
  );
  const balanceRALBTAfterActions = await rALBTContract.balanceOf(
    lenderSigner.address
  );

  // Then
  // Correct balance of rALBT
  expect(balanceRALBTAfterActionsActionCaller).to.be.equal(
    balanceRALBTBeforeActionsActionCaller.add(
      rewardPerActionProvisionPerLevel3.mul(amountOfActions)
    )
  );
  // expect(balanceRALBTAfterActions).to.be.equal(
  //   balanceRALBTBeforeActions
  //     .add(rewardPerActionLevel0)
  //     .add(rewardPerActionPerLevelAfterFirstTime0.mul(amountOfActions - 1))
  // );
};
// export const batchGetRALBTWithActions = async (
//   data: GetRALBTData[],
//   deployerSigner: Signer
// ) => {
//   //  data = {lenderSigner: any, actionCallerSigner: any}
//   for (let i = 0; i < data.length; i++) {
//     await increaseTime(deployerSigner.provider, 1 * 24 * 60 * 60); // 1 day
//     await getRALBTWithActions(
//       data[i].lenderSigner,
//       data[i].actionCallerSigner,
//       deployerSigner
//     );
//   }
// };

// 4) Funders declare their intention to buy a partition (effectively depositing their funds)
// IMPORTANT the lenderSigner.address needs to have more rALBT than rAlbtPerLotteryNumber
export const declareIntentionForBuy = async (
  investmentId: BigNumber,
  lenderSigner: any,
  numberOfPartitions: BigNumber,
  lendingTokenContract: any
) => {
  // When
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

    // When
    await registryContract
      .connect(lenderSigner)
      .showInterestForInvestment(investmentId, numberOfPartitions);

    const lenderLendingTokenBalanceAfter = await lendingTokenContract.balanceOf(
      lenderSigner.address
    );

    const escrowLendingTokenBalanceAfter = await lendingTokenContract.balanceOf(
      escrowContract.address
    );

    // Then
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
export const batchDeclareIntentionForBuy = async (data: ShowInterestData[]) => {
  for (let i = 0; i < data.length; i++) {
    await declareIntentionForBuy(
      data[i].investmentId,
      data[i].lenderSigner,
      data[i].numberOfPartitions,
      data[i].lendingTokenContract
    );
  }
};

//5) The lottery is run when all the partitions have been covered
export const runLottery = async (
  investmentId: BigNumber,
  lotteryRunnerSigner: any,
  superDelegatorSigner: any
) => {
  // Given
  const {registryContract, governanceContract} = await getContracts();
  const ticketsRemainingBefore = await registryContract.ticketsRemaining(
    investmentId
  );

  for (let i = 0; i < 50; i++) {
    const investmentStatus = await registryContract.investmentStatus(
      investmentId
    );
    if (investmentStatus === 2) {
      break;
    }
    await governanceContract.connect(superDelegatorSigner).checkCronjobs();
  }

  const investmentStatus = await registryContract.investmentStatus(
    investmentId
  );
  expect(investmentStatus).to.be.equal(2);

  // When
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

  // Then
  expect(ticketsRemainingAfter.toNumber()).to.be.lessThan(
    ticketsRemainingBefore.toNumber()
  );
  return ticketsRemainingAfter;
};
export const batchRunLottery = async (
  data: RunLotteryData[],
  superDelegatorSigner: Signer
) => {
  for (let i = 0; i < data.length; i++) {
    await runLottery(
      data[i].investmentId,
      data[i].lotteryRunnerSigner,
      superDelegatorSigner
    );
  }
};

//6) FundingNFTs are minted and each Funder either receives their NFT or their funds back in case they did not win the lottery
export const funderClaimLotteryReward = async (
  investmentId: BigNumber,
  lenderSigner: any,
  amountTicketsToBlock: BigNumber,
  lendingTokenContract: Contract
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
      if (ticketsWonBefore.lt(amountTicketsToBlock)) {
        amountTicketsToBlock = ticketsWonBefore;
      }
      await expect(
        registryContract
          .connect(lenderSigner)
          .withdrawInvestmentTickets(
            investmentId,
            amountTicketsToBlock,
            ticketsWonBefore.sub(amountTicketsToBlock)
          )
      )
        .to.emit(registryContract, 'WithdrawInvestmentTickets')
        .withArgs(
          investmentId,
          amountTicketsToBlock,
          ticketsWonBefore.sub(amountTicketsToBlock)
        );

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

    const balanceFundingNFTTokenAfter = await fundingNFTContract.balanceOf(
      lenderSigner.address,
      investmentId.toNumber()
    );

    const lenderLendingTokenBalanceAfterWithdraw =
      await lendingTokenContract.balanceOf(lenderSigner.address);

    expect(ticketsAfter.toNumber()).to.be.equal(0);

    if (ticketsWonBefore.toNumber() > 0) {
      if (ticketsWonBefore.eq(amountTicketsToBlock)) {
        expect(balanceFundingNFTTokenAfter.toNumber()).to.be.equal(0);
      } else {
        expect(balanceFundingNFTTokenAfter).to.be.gt(
          balanceFundingNFTTokenBefore
        );
      }
    }

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
export const batchFunderClaimLotteryReward = async (
  data: FunderClaimRewardData[]
) => {
  for (let i = 0; i < data.length; i++) {
    await funderClaimLotteryReward(
      data[i].investmentId,
      data[i].lenderSigner,
      data[i].amountTicketsToBlock,
      data[i].lendingTokenContract
    );
  }
};

//7) Funders with a FundingNFT exchange it for their Investment tokens.
export const exchangeNFTForInvestmentToken = async (
  investmentId: BigNumber,
  lenderSigner: Signer,
  investmentTokenContract: Contract
) => {
  // Given
  const {registryContract, fundingNFTContract} = await getContracts();

  const balanceFundingNFTTokenAfter = await fundingNFTContract.balanceOf(
    await lenderSigner.getAddress(),
    investmentId.toNumber()
  );

  const investmentTokensPerTicket =
    await registryContract.investmentTokensPerTicket(investmentId);

  const balanceOfInvestmentTokenBefore =
    await investmentTokenContract.balanceOf(await lenderSigner.getAddress());

  if (balanceFundingNFTTokenAfter.toNumber() > 0) {
    // When
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

  const balanceOfInvestmentTokenAfter = await investmentTokenContract.balanceOf(
    await lenderSigner.getAddress()
  );

  // Then
  expect(
    await fundingNFTContract.balanceOf(
      await lenderSigner.getAddress(),
      investmentId.toNumber()
    )
  ).to.be.equal(0);

  expect(balanceOfInvestmentTokenAfter.toString()).to.be.equal(
    balanceOfInvestmentTokenBefore.add(
      ethers.utils.parseEther('50').mul(balanceFundingNFTTokenAfter).toString()
    )
  );
};
export const batchExchangeNFTForInvestmentToken = async (
  data: ExchangeNFTForInvestmentTokenData[]
) => {
  for (let i = 0; i < data.length; i++) {
    await exchangeNFTForInvestmentToken(
      data[i].investmentId,
      data[i].lenderSigner,
      data[i].investmentTokenContract
    );
  }
};

//8) Seeker claims the funding, when all investment tokens have been exchanged.

export const seekerClaimsFunding = async (
  investmentId: BigNumber,
  seekerSigner: Signer
): Promise<void> => {
  const {registryContract, lendingTokenContract} = await getContracts();
  // given
  const seekerInitialLendingBalance = await lendingTokenContract.balanceOf(
    await seekerSigner.getAddress()
  );
  const expectedAmount = (
    await registryContract.investmentDetails(investmentId)
  ).totalAmountToBeRaised;

  // when
  await expect(
    registryContract.connect(seekerSigner).withdrawInvestment(investmentId)
  )
    .to.emit(registryContract, 'seekerWithdrawInvestment')
    .withArgs(investmentId, expectedAmount);

  const seekerFinalLendingBalance = await lendingTokenContract.balanceOf(
    await seekerSigner.getAddress()
  );
  const investmentWithdrawn = await registryContract.investmentWithdrawn(
    investmentId
  );
  const seekerGotLendingTokens = seekerFinalLendingBalance.eq(
    seekerInitialLendingBalance.add(expectedAmount)
  );
  //then
  expect(investmentWithdrawn).to.be.equal(true);
  expect(seekerGotLendingTokens).to.be.equal(true);
};
