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
  Action,
  AddNewAction,
  SeekerClaimsFunding,
} from './interfaces';

import {ethers, web3} from 'hardhat';
import {expect} from 'chai';
import {BigNumber} from 'ethers';
import {getTransactionTimestamp, increaseTime} from './time';
import {CronjobType} from './governanceEnums';
const {expectRevert} = require('@openzeppelin/test-helpers');

//1) Allows Seeker publishes Investment
export const requestInvestment = async (
  investmentTokenContract: Contract,
  amountOfTokensToBePurchased: BigNumber,
  lendingTokenContract: Contract,
  totalAmountRequested: BigNumber,
  ipfsHash: any,
  seekerSigner: Signer
): Promise<BigNumber> => {
  const {
    registryContract,
    escrowContract,
    fundingNFTContract,
    governanceContract,
  } = await getContracts();

  const seekerAddress = await seekerSigner.getAddress();
  const investmentId = await registryContract.totalInvestments();
  const totalInvestmentsBefore = await registryContract.totalInvestments();
  const balanceInvestmentTokenSeekerBefore =
    await investmentTokenContract.balanceOf(seekerAddress);
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
    await investmentTokenContract.balanceOf(seekerAddress);
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
    .withArgs(investmentId, seekerAddress, totalAmountRequested);

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
  expect(investmentSeeker).to.be.equal(seekerAddress);
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
  superDelegatorSigner: Signer,
  approve: boolean
) => {
  // Given
  const {registryContract, governanceContract} = await getContracts();
  const superDelegatorAddress = await superDelegatorSigner.getAddress();

  const investmentDetailsBeforeApprove =
    await registryContract.investmentDetails(investmentId);
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
    .withArgs(investmentId, investmentId, true, superDelegatorAddress);

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
  lenderSigner: Signer,
  stakingLevel: StakingType
) => {
  const {stakingContract, ALBTContract, rALBTContract, stakerMedalNFTContract} =
    await getContracts();

  const lenderAddress = await lenderSigner.getAddress();

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
      lenderAddress
    );
    const balanceALBTStakingContractBeforeStake = await ALBTContract.balanceOf(
      stakingContract.address
    );
    const totalSupplyBeforeStake = await stakingContract.totalSupply();

    const balanceStakingStakerBeforeStake = await stakingContract.getBalance(
      lenderAddress
    );

    const amountToStake = stakingTypeAmount.sub(
      balanceStakingStakerBeforeStake
    );
    // When
    await expect(stakingContract.connect(lenderSigner).stake(stakingLevel))
      .to.emit(stakingContract, 'Staked')
      .withArgs(lenderAddress, amountToStake);
    const balanceRALBTAfterStake = await rALBTContract.balanceOf(lenderAddress);
    const balanceStakerMedal1 = await stakerMedalNFTContract.balanceOf(
      lenderAddress,
      1
    );
    const balanceStakerMedal2 = await stakerMedalNFTContract.balanceOf(
      lenderAddress,
      2
    );
    const balanceStakerMedal3 = await stakerMedalNFTContract.balanceOf(
      lenderAddress,
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
      lenderAddress
    );
    const balanceALBTStakingContractAfterStake = await ALBTContract.balanceOf(
      stakingContract.address
    );
    const totalSupplyAfterStake = await stakingContract.totalSupply();

    const balanceStakingStakerAfterStake = await stakingContract.getBalance(
      lenderAddress
    );

    const levelOfStakerAfter = await stakerMedalNFTContract.getLevelOfStaker(
      lenderAddress
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

// Add New Actions
export const addNewAction = async (
  deployerSigner: Signer,
  action: Action[],
  reputationalAlbtRewardsPerLevel: BigNumber[],
  reputationalAlbtRewardsPerLevelAfterFirstTime: BigNumber[]
) => {
  // Given
  const {actionVerifierContract} = await getContracts();

  // Then
  await expect(
    actionVerifierContract
      .connect(deployerSigner)
      .importAction(
        action[0].actionName,
        reputationalAlbtRewardsPerLevel,
        reputationalAlbtRewardsPerLevelAfterFirstTime,
        2,
        ethers.constants.AddressZero
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
export const batchAddNewAction = async (
  deployerSigner: Signer,
  newAction: AddNewAction[]
) => {
  for (let i = 0; i < newAction.length; i++) {
    await addNewAction(
      deployerSigner,
      newAction[i].action,
      newAction[i].reputationalAlbtRewardsPerLevel,
      newAction[i].reputationalAlbtRewardsPerLevelAfterFirstTime
    );
  }
};

export const getRALBTWithActions = async (
  lenderSigner: Signer,
  actionCallerSigner: Signer,
  amountOfActions: number,
  actions: Action[]
) => {
  // Given
  const {actionVerifierContract, rALBTContract, stakerMedalNFTContract} =
    await getContracts();
  const lenderAddress = await lenderSigner.getAddress();
  const actionCallerAddress = await actionCallerSigner.getAddress();
  const stakingLevelLender = await stakerMedalNFTContract.getLevelOfStaker(
    lenderAddress
  );
  const stakingLevelActionCaller =
    await stakerMedalNFTContract.getLevelOfStaker(actionCallerAddress);

  const balanceRALBTBeforeActions = await rALBTContract.balanceOf(
    lenderAddress
  );
  const balanceRALBTBeforeActionsActionCaller = await rALBTContract.balanceOf(
    actionCallerAddress
  );

  const lastEpochActionDonePerAccountBefore =
    await actionVerifierContract.lastEpochActionDonePerAccount(
      lenderAddress,
      web3.utils.keccak256(actions[0].actionName)
    );

  const rewardPerActionProvisionPerLevel =
    await actionVerifierContract.rewardPerActionProvisionPerLevel(
      stakingLevelActionCaller
    );
  const rewardPerActionLevel =
    await actionVerifierContract.rewardPerActionPerLevel(
      web3.utils.keccak256(actions[0].actionName),
      stakingLevelLender
    );
  const rewardPerActionPerLevelAfterFirstTime =
    await actionVerifierContract.rewardPerActionPerLevelAfterFirstTime(
      web3.utils.keccak256(actions[0].actionName),
      stakingLevelLender
    );

  const signature = await getSignature(
    actions[0].actionName,
    actions[0].answer,
    actions[0].account,
    actions[0].referralId,
    actionVerifierContract.address,
    web3
  );

  const signatures = [signature];

  // When
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
    actionCallerAddress
  );
  const balanceRALBTAfterActions = await rALBTContract.balanceOf(lenderAddress);
  const lenderReward = () => {
    if (lastEpochActionDonePerAccountBefore.eq(0)) {
      return balanceRALBTBeforeActions
        .add(rewardPerActionLevel)
        .add(rewardPerActionPerLevelAfterFirstTime.mul(amountOfActions - 1));
    } else {
      return balanceRALBTBeforeActions.add(
        rewardPerActionPerLevelAfterFirstTime.mul(amountOfActions)
      );
    }
  };
  // Then
  // Correct balance of rALBT
  expect(balanceRALBTAfterActionsActionCaller).to.be.equal(
    balanceRALBTBeforeActionsActionCaller.add(
      rewardPerActionProvisionPerLevel.mul(amountOfActions)
    )
  );
  expect(balanceRALBTAfterActions).to.be.equal(lenderReward());
};
export const batchGetRALBTWithActions = async (
  getRALBTData: GetRALBTData[],
  deployerSigner: Signer
) => {
  //  data = {lenderSigner: any, actionCallerSigner: any}
  for (let i = 0; i < getRALBTData.length; i++) {
    await increaseTime(deployerSigner.provider, 1 * 24 * 60 * 60); // 1 day
    await getRALBTWithActions(
      getRALBTData[i].lenderSigner,
      getRALBTData[i].actionCallerSigner,
      getRALBTData[i].amountOfActions,
      getRALBTData[i].actions
    );
  }
};

// 4) Funders declare their intention to buy a partition (effectively depositing their funds)
// IMPORTANT the lenderAddress needs to have more rALBT than rAlbtPerLotteryNumber
export const declareIntentionForBuy = async (
  investmentId: BigNumber,
  lenderSigner: Signer,
  numberOfPartitions: BigNumber,
  lendingTokenContract: Contract
) => {
  // When
  const {escrowContract, registryContract, rALBTContract} =
    await getContracts();

  const lenderAddress = await lenderSigner.getAddress();

  const rAlbtPerLotteryNumber = await registryContract.rAlbtPerLotteryNumber();
  const rALBTBalanceBefore = await rALBTContract.balanceOf(lenderAddress);

  if (rALBTBalanceBefore.gte(rAlbtPerLotteryNumber)) {
    const amountOfLendingTokens = numberOfPartitions.mul(
      ethers.utils.parseEther(BASE_AMOUNT + '')
    );
    const initLenderLendingTokenBalance = await lendingTokenContract.balanceOf(
      lenderAddress
    );
    const initEscrowLendingTokenBalance = await lendingTokenContract.balanceOf(
      escrowContract.address
    );

    const rALBTPerLotteryNumber =
      await registryContract.rAlbtPerLotteryNumber();
    const lotteryNumbersForImmediateTicket =
      await registryContract.lotteryNumbersForImmediateTicket();
    let totalLotteryNumbersForLender = (
      await rALBTContract.balanceOf(lenderAddress)
    ).div(rALBTPerLotteryNumber);
    let immediateTicketsLender = BigNumber.from(0);
    let ticketsRemaining = await registryContract.ticketsRemaining(
      investmentId
    );
    let totalLotteryNumbersPerInvestment =
      await registryContract.totalLotteryNumbersPerInvestment(investmentId);
    const partitionsRequestedBefore = (
      await registryContract.investmentDetails(investmentId)
    ).partitionsRequested;

    // When
    await registryContract
      .connect(lenderSigner)
      .showInterestForInvestment(investmentId, numberOfPartitions);

    const partitionsRequestedAfter = (
      await registryContract.investmentDetails(investmentId)
    ).partitionsRequested;

    //then check for immediate tickets
    if (totalLotteryNumbersForLender.gt(lotteryNumbersForImmediateTicket)) {
      // these cases do NOT take into account previously locked tokens, that case has to be tested in a different way
      // this is only valid for Happy path
      const rest = totalLotteryNumbersForLender
        .sub(1)
        .mod(lotteryNumbersForImmediateTicket)
        .add(1);
      immediateTicketsLender = totalLotteryNumbersForLender
        .sub(rest)
        .div(lotteryNumbersForImmediateTicket);

      totalLotteryNumbersForLender = rest;
      if (immediateTicketsLender.gt(0)) {
        expect(
          (
            await registryContract.ticketsWonPerAddress(
              investmentId,
              lenderAddress
            )
          ).eq(immediateTicketsLender)
        ).to.be.true;
        const remaining = await registryContract.ticketsRemaining(investmentId);
        expect(remaining.eq(ticketsRemaining.sub(immediateTicketsLender))).to.be
          .true;
        ticketsRemaining = remaining.sub(immediateTicketsLender);
      }
    }
    expect(
      (
        await registryContract.remainingTicketsPerAddress(
          investmentId,
          lenderAddress
        )
      ).eq(numberOfPartitions.sub(immediateTicketsLender))
    ).to.be.true;
    expect(
      (
        await registryContract.totalLotteryNumbersPerInvestment(investmentId)
      ).eq(totalLotteryNumbersPerInvestment.add(totalLotteryNumbersForLender))
    ).to.be.true;

    const lenderLendingTokenBalanceAfter = await lendingTokenContract.balanceOf(
      lenderAddress
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

    expect(partitionsRequestedAfter).to.be.equal(
      partitionsRequestedBefore.add(numberOfPartitions)
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
  lotteryRunnerSigner: Signer,
  superDelegatorSigner: Signer
) => {
  const {registryContract, governanceContract, fundingNFTContract} =
    await getContracts();

  // When
  const lotteryStarted = await governanceContract
    .connect(superDelegatorSigner)
    .checkCronjobs();

  const investmentStatusAfter = await registryContract.investmentStatus(
    investmentId
  );

  const investmentDetailsLotteryStarted =
    await registryContract.investmentDetails(investmentId);

  // Then
  // Events
  expect(lotteryStarted)
    .to.emit(registryContract, 'InvestmentStarted')
    .withArgs(investmentId);

  // Verify the node
  // Correct lottery status
  expect(investmentStatusAfter.toString()).to.be.equal(
    InvestmentStatus.STARTED
  );
  // Correct investment details
  expect(investmentDetailsLotteryStarted.startingDate).to.be.equal(
    await getTransactionTimestamp(lotteryStarted.hash)
  );

  // Run Lottery
  // When
  const runLottery = await registryContract
    .connect(lotteryRunnerSigner)
    .executeLotteryRun(investmentId);

  const ticketsRemainingAfterRunLottery =
    await registryContract.ticketsRemaining(investmentId);

  const investmentStatusAfterRunLottery =
    await registryContract.investmentStatus(investmentId);

  const isPauseFundingNFTTransferAfterRunLottey =
    await fundingNFTContract.transfersPaused(investmentId);

  // Then
  // Events
  expect(runLottery)
    .to.emit(registryContract, 'LotteryExecuted')
    .withArgs(investmentId);
  expect(runLottery)
    .to.emit(registryContract, 'InvestmentSettled')
    .withArgs(investmentId);
  expect(runLottery)
    .to.emit(fundingNFTContract, 'TransfersResumed')
    .withArgs(investmentId);
  // Correct tickets remaining
  expect(ticketsRemainingAfterRunLottery).to.be.equal(0);
  // Correct status
  expect(investmentStatusAfterRunLottery.toString()).to.be.equal(
    InvestmentStatus.SETTLED
  );
  // Unpause token
  expect(isPauseFundingNFTTransferAfterRunLottey).to.be.false;
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
  lenderSigner: Signer,
  amountTicketsToBlock: BigNumber,
  lendingTokenContract: Contract
) => {
  const {registryContract, fundingNFTContract, escrowContract} =
    await getContracts();

  const lenderAddress = await lenderSigner.getAddress();

  const ticketsRemaining = await registryContract.ticketsRemaining(
    investmentId
  );

  if (ticketsRemaining.eq(0)) {
    // Given
    const ticketsWonBeforeWithdraw =
      await registryContract.ticketsWonPerAddress(investmentId, lenderAddress);
    const lockedTicketsForSpecificInvestmentBeforeWithdraw =
      await registryContract.lockedTicketsForSpecificInvestmentPerAddress(
        investmentId,
        lenderAddress
      );
    const lockedTicketsBeforeWithdraw =
      await registryContract.lockedTicketsPerAddress(lenderAddress);
    const balanceFundingNFTTokenBeforeWithdraw =
      await fundingNFTContract.balanceOf(
        lenderAddress,
        investmentId.toNumber()
      );
    const ticketsRemainBeforeWithdraw =
      await registryContract.remainingTicketsPerAddress(
        investmentId,
        lenderAddress
      );
    const balanceLendingTokenBeforeWithdraw =
      await lendingTokenContract.balanceOf(lenderAddress);
    const balanceLendingTokenBeforeWithdrawEscrow =
      await lendingTokenContract.balanceOf(escrowContract.address);
    let withdrawInvestmentTickets;

    // When
    if (ticketsWonBeforeWithdraw.gt(0)) {
      amountTicketsToBlock = amountTicketsToBlock.gt(ticketsWonBeforeWithdraw)
        ? ticketsWonBeforeWithdraw
        : amountTicketsToBlock;
      withdrawInvestmentTickets = await registryContract
        .connect(lenderSigner)
        .withdrawInvestmentTickets(
          investmentId,
          amountTicketsToBlock,
          ticketsWonBeforeWithdraw.sub(amountTicketsToBlock)
        );
    }
    const ticketsWonAfterWithdraw = await registryContract.ticketsWonPerAddress(
      investmentId,
      lenderAddress
    );
    const lockedTicketsForSpecificInvestmentAfterWithdraw =
      await registryContract.lockedTicketsForSpecificInvestmentPerAddress(
        investmentId,
        lenderAddress
      );
    const lockedTicketsAfterWithdraw =
      await registryContract.lockedTicketsPerAddress(lenderAddress);
    const balanceFundingNFTTokenAfterWithdraw =
      await fundingNFTContract.balanceOf(lenderAddress, investmentId);
    const ticketsRemainAfterWithdraw =
      await registryContract.remainingTicketsPerAddress(
        investmentId,
        lenderAddress
      );
    const balanceLendingTokenAfterWithdraw =
      await lendingTokenContract.balanceOf(lenderAddress);
    const balanceLendingTokenAfterWithdrawEscrow =
      await lendingTokenContract.balanceOf(escrowContract.address);

    // Then
    // Events
    // Withdraw Investment
    expect(withdrawInvestmentTickets)
      .to.emit(registryContract, 'WithdrawInvestmentTickets')
      .withArgs(
        investmentId,
        amountTicketsToBlock,
        ticketsWonBeforeWithdraw.sub(amountTicketsToBlock)
      );
    // WithdrawAmountForNonTickets
    if (ticketsRemainBeforeWithdraw.gt(0)) {
      expect(withdrawInvestmentTickets)
        .to.emit(registryContract, 'WithdrawAmountForNonTickets')
        .withArgs(
          investmentId,
          ethers.utils
            .parseEther(BASE_AMOUNT + '')
            .mul(ticketsRemainBeforeWithdraw)
        );
    }
    // Correct amount of won tickets
    expect(ticketsWonAfterWithdraw).to.be.equal(0);
    // Correct amount of tickets locked for specific investment
    expect(lockedTicketsForSpecificInvestmentAfterWithdraw).to.be.equal(
      lockedTicketsForSpecificInvestmentBeforeWithdraw.add(amountTicketsToBlock)
    );
    // Correct amount of tickets locked
    expect(lockedTicketsAfterWithdraw).to.be.equal(
      lockedTicketsBeforeWithdraw.add(amountTicketsToBlock)
    );

    // Correct balance of funding nft
    if (ticketsWonBeforeWithdraw.gt(0)) {
      expect(balanceFundingNFTTokenAfterWithdraw).to.be.equal(
        balanceFundingNFTTokenBeforeWithdraw.add(
          ticketsWonBeforeWithdraw.sub(amountTicketsToBlock)
        )
      );
    }
    // Correct amount of tickets remaining
    expect(ticketsRemainAfterWithdraw).to.be.equal(0);

    // Correct balance of lending token
    expect(balanceLendingTokenAfterWithdraw).to.be.equal(
      balanceLendingTokenBeforeWithdraw.add(
        ethers.utils
          .parseEther(BASE_AMOUNT + '')
          .mul(ticketsRemainBeforeWithdraw)
      )
    );

    expect(balanceLendingTokenAfterWithdrawEscrow).to.be.equal(
      balanceLendingTokenBeforeWithdrawEscrow.sub(
        ethers.utils
          .parseEther(BASE_AMOUNT + '')
          .mul(ticketsRemainBeforeWithdraw)
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
  const {registryContract, fundingNFTContract, escrowContract} =
    await getContracts();
  const lenderAddress = await lenderSigner.getAddress();
  const investmentTokensPerTicket =
    await registryContract.investmentTokensPerTicket(investmentId);
  const balanceFundingNFTTokenBeforeExchange =
    await fundingNFTContract.balanceOf(lenderAddress, investmentId.toNumber());
  const balanceOfInvestmentTokenBeforeExchange =
    await investmentTokenContract.balanceOf(lenderAddress);

  const balanceOfInvestmentTokenBeforeExhangeEscrow =
    await investmentTokenContract.balanceOf(escrowContract.address);

  // When
  if (balanceFundingNFTTokenBeforeExchange.toNumber() > 0) {
    await expect(
      registryContract
        .connect(lenderSigner)
        .convertNFTToInvestmentTokens(
          investmentId,
          balanceFundingNFTTokenBeforeExchange
        )
    )
      .to.emit(registryContract, 'ConvertNFTToInvestmentTokens')
      .withArgs(
        investmentId,
        balanceFundingNFTTokenBeforeExchange,
        investmentTokensPerTicket.mul(balanceFundingNFTTokenBeforeExchange)
      );
  }

  const balanceFundingNFTTokenAfterExchange =
    await fundingNFTContract.balanceOf(lenderAddress, investmentId.toNumber());

  const balanceOfInvestmentTokenAfterExhange =
    await investmentTokenContract.balanceOf(lenderAddress);

  const balanceOfInvestmentTokenAfterExhangeEscrow =
    await investmentTokenContract.balanceOf(escrowContract.address);

  // Then
  // Correct balance of funding nft
  expect(balanceFundingNFTTokenAfterExchange).to.be.equal(0);

  // Correct balance of investment token
  expect(balanceOfInvestmentTokenAfterExhange).to.be.equal(
    balanceOfInvestmentTokenBeforeExchange.add(
      investmentTokensPerTicket.mul(balanceFundingNFTTokenBeforeExchange)
    )
  );
  expect(balanceOfInvestmentTokenAfterExhangeEscrow).to.be.equal(
    balanceOfInvestmentTokenBeforeExhangeEscrow.sub(
      investmentTokensPerTicket.mul(balanceFundingNFTTokenBeforeExchange)
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
export const batchSeekerClaimsFunding = async (
  seekerClaimsFundingData: SeekerClaimsFunding[]
) => {
  for (let i = 0; i < seekerClaimsFundingData.length; i++) {
    await seekerClaimsFunding(
      seekerClaimsFundingData[i].investmentId,
      seekerClaimsFundingData[i].seekerSigner
    );
  }
};
