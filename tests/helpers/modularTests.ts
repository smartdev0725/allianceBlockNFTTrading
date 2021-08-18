/* eslint-disable @typescript-eslint/no-var-requires */
import {getContracts, getSignature} from './utils';
import {StakingType, ProjectStatusTypes} from './ProjectEnums';
import {BASE_AMOUNT} from './constants';
import {Signer, Contract} from 'ethers';
import {
  IInvestment,
  IInvestmentForApproval,
  IStake,
  IGetRALBTData,
  IShowInterestData,
  IRunLotteryData,
  IFunderClaimRewardData,
  IExchangeNFTForInvestmentTokenData,
  IAction,
  IAddNewAction,
  ISeekerClaimsFunding,
  ILenderInfo,
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
  ipfsHash: string,
  seekerSigner: Signer
): Promise<BigNumber> => {
  /// Given
  const {
    projectManagerContract,
    investmentContract,
    escrowContract,
    fundingNFTContract,
    governanceContract,
  } = await getContracts();

  const seekerAddress = await seekerSigner.getAddress();
  const investmentId = await projectManagerContract.totalProjects();
  const totalProjectsBefore = await projectManagerContract.totalProjects();
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
  const requestInvestment = await investmentContract
    .connect(seekerSigner)
    .requestInvestment(
      investmentTokenContract.address,
      amountOfTokensToBePurchased,
      lendingTokenContract.address,
      totalAmountRequested,
      ipfsHash
    );

  const investmentDetails = await investmentContract.investmentDetails(
    investmentId
  );
  const projectSeeker = await investmentContract.projectSeeker(investmentId);
  const totalProjectsAfter = await projectManagerContract.totalProjects();
  const balanceInvestmentTokenSeekerAfter =
    await investmentTokenContract.balanceOf(seekerAddress);
  const balanceInvestmentTokenEscrowAfter =
    await investmentTokenContract.balanceOf(escrowContract.address);
  const balanceFundingNftEscrowAfter = await fundingNFTContract.balanceOf(
    escrowContract.address,
    investmentId
  );
  const investmentTokensPerTicket =
    await investmentContract.investmentTokensPerTicket(investmentId);
  const isPauseFundingNFTTransfer = await fundingNFTContract.transfersPaused(
    investmentId
  );
  const totalApprovalRequestsAfter =
    await governanceContract.totalApprovalRequests();
  const approvalRequest = await governanceContract.approvalRequests(
    totalApprovalRequestsBefore
  );
  const projectStatus = await investmentContract.projectStatus(investmentId);
  // Then
  // Events
  expect(requestInvestment)
    .to.emit(fundingNFTContract, 'TransfersPaused')
    .withArgs(investmentId);
  expect(requestInvestment)
    .to.emit(governanceContract, 'ApprovalRequested')
    .withArgs(investmentId, investmentContract.address);
  expect(requestInvestment)
    .to.emit(investmentContract, 'ProjectRequested')
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
  expect(projectSeeker).to.be.equal(seekerAddress);
  // Correct total of investments
  expect(totalProjectsAfter.toNumber()).to.be.equal(
    totalProjectsBefore.toNumber() + 1
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
  expect(approvalRequest.projectId).to.be.equal(investmentId);
  expect(approvalRequest.approvalsProvided.toString()).to.be.equal('0');
  expect(approvalRequest.isApproved).to.be.false;
  expect(approvalRequest.isProcessed).to.be.false;
  expect(totalApprovalRequestsAfter.toNumber()).to.be.equal(
    totalApprovalRequestsBefore.toNumber() + 1
  );
  // Correct Status
  expect(String(projectStatus)).to.be.equal(
    String(ProjectStatusTypes.REQUESTED)
  );

  return investmentId;
};
export const batchRequestInvestment = async (
  investments: IInvestment[]
): Promise<BigNumber[]> => {
  const investmentIds: BigNumber[] = [];

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
    investmentIds.push(investmentId);
  }
  expect(investmentIds.length).to.be.equal(investments.length);
  return investmentIds;
};

//2) SuperGovernance decides if apporve Investment
export const handleInvestmentRequest = async (
  investmentId: BigNumber,
  superDelegatorSigner: Signer,
  shouldApprove: boolean
): Promise<void> => {
  // Given
  const {governanceContract, investmentContract} = await getContracts();
  const superDelegatorAddress = await superDelegatorSigner.getAddress();

  const investmentDetailsBeforeApprove =
    await investmentContract.investmentDetails(investmentId);
  const totalCronjobsBeforeApprove = await governanceContract.totalCronjobs();
  const cronjobsListBeforeApprove = await governanceContract.cronjobList();

  // When
  const approveInvestment = await governanceContract
    .connect(superDelegatorSigner)
    .superVoteForRequest(investmentId, shouldApprove);

  const projectStatusTypesAfterApprove = await investmentContract.projectStatus(
    investmentId
  );
  const investmentDetailsAfterApprove =
    await investmentContract.investmentDetails(investmentId);
  const ticketsRemainingAfterApprove =
    await investmentContract.ticketsRemaining(investmentId);
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
    .to.emit(investmentContract, 'ProjectApproved')
    .withArgs(investmentId);
  expect(approveInvestment)
    .to.emit(governanceContract, 'VotedForRequest')
    .withArgs(investmentId, true, superDelegatorAddress);

  // Correct investment status
  expect(String(projectStatusTypesAfterApprove)).to.be.equal(
    String(ProjectStatusTypes.APPROVED)
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
  expect(cronjobsAfterApprove.projectId).to.be.equal(investmentId);
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
  investmentsForApprove: IInvestmentForApproval[],
  superDelegatorSigner: Signer
): Promise<void> => {
  for (let index = 0; index < investmentsForApprove.length; index++) {
    const investment = investmentsForApprove[index];
    await handleInvestmentRequest(
      investment.investmentId,
      superDelegatorSigner,
      investment.shouldApprove
    );
  }
};

//3) Funders stake
export const fundersStake = async (
  lenderSigner: Signer,
  stakingLevel: StakingType
): Promise<void> => {
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
export const batchFundersStake = async (data: IStake[]): Promise<void> => {
  for (let i = 0; i < data.length; i++) {
    await fundersStake(data[i].lenderSigner, data[i].stakingLevel);
  }
};

// Add New Actions
export const addNewAction = async (
  deployerSigner: Signer,
  action: IAction,
  reputationalAlbtRewardsPerLevel: BigNumber[],
  reputationalAlbtRewardsPerLevelAfterFirstTime: BigNumber[]
): Promise<void> => {
  // Given
  const {actionVerifierContract} = await getContracts();

  // Then
  await expect(
    actionVerifierContract
      .connect(deployerSigner)
      .importAction(
        action.actionName,
        reputationalAlbtRewardsPerLevel,
        reputationalAlbtRewardsPerLevelAfterFirstTime,
        2,
        ethers.constants.AddressZero
      )
  )
    .to.emit(actionVerifierContract, 'ActionImported')
    .withArgs(action.actionName);

  // Reward per action
  const rewardPerActionLevel0 =
    await actionVerifierContract.rewardPerActionPerLevel(
      web3.utils.keccak256(action.actionName),
      0
    );
  const rewardPerActionLevel1 =
    await actionVerifierContract.rewardPerActionPerLevel(
      web3.utils.keccak256(action.actionName),
      1
    );
  const rewardPerActionLevel2 =
    await actionVerifierContract.rewardPerActionPerLevel(
      web3.utils.keccak256(action.actionName),
      2
    );
  const rewardPerActionLevel3 =
    await actionVerifierContract.rewardPerActionPerLevel(
      web3.utils.keccak256(action.actionName),
      3
    );
  // Reward per action after first time
  const rewardPerActionPerLevelAfterFirstTime0 =
    await actionVerifierContract.rewardPerActionPerLevelAfterFirstTime(
      web3.utils.keccak256(action.actionName),
      0
    );
  const rewardPerActionPerLevelAfterFirstTime1 =
    await actionVerifierContract.rewardPerActionPerLevelAfterFirstTime(
      web3.utils.keccak256(action.actionName),
      1
    );
  const rewardPerActionPerLevelAfterFirstTime2 =
    await actionVerifierContract.rewardPerActionPerLevelAfterFirstTime(
      web3.utils.keccak256(action.actionName),
      2
    );
  const rewardPerActionPerLevelAfterFirstTime3 =
    await actionVerifierContract.rewardPerActionPerLevelAfterFirstTime(
      web3.utils.keccak256(action.actionName),
      3
    );

  const minimumLevelForActionProvision =
    await actionVerifierContract.minimumLevelForActionProvision(
      web3.utils.keccak256(action.actionName)
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
  actions: IAddNewAction[]
): Promise<void> => {
  for (let i = 0; i < actions.length; i++) {
    await addNewAction(
      deployerSigner,
      actions[i].action,
      actions[i].reputationalAlbtRewardsPerLevel,
      actions[i].reputationalAlbtRewardsPerLevelAfterFirstTime
    );
  }
};
export const actionsPerLender = (actions: IAction[]): ILenderInfo[] => {
  const lendersInfo: ILenderInfo[] = [];

  for (let index = 0; index < actions.length; index++) {
    const action = actions[index];
    const lenderIndex = lendersInfo.findIndex(
      (lender) => lender.account === action.account
    );
    if (lenderIndex >= 0) {
      // Lender already has an action
      const lenderInfo = lendersInfo[lenderIndex];
      const actionIndex = lenderInfo.actions.findIndex(
        (act) => act.name === action.actionName
      );
      if (actionIndex >= 0) {
        // Already excute an action
        lendersInfo[lenderIndex].actions[actionIndex].amountOfTimes =
          lendersInfo[lenderIndex].actions[actionIndex].amountOfTimes.add(1);
      } else {
        // First time that excute an action
        lendersInfo[lenderIndex].actions.push({
          name: action.actionName,
          lastEpoch: BigNumber.from(0),
          amountOfTimes: BigNumber.from(1),
          rewardPerActionLevel: BigNumber.from(0),
          rewardPerActionPerLevelAfterFirstTime: BigNumber.from(0),
        });
      }
    } else {
      // Lender has no actions
      lendersInfo.push({
        account: action.account,
        balanceBefore: BigNumber.from(0),
        stakingLevel: StakingType.STAKER_LVL_0,
        actions: [
          {
            name: action.actionName,
            lastEpoch: BigNumber.from(0),
            amountOfTimes: BigNumber.from(1),
            rewardPerActionLevel: BigNumber.from(0),
            rewardPerActionPerLevelAfterFirstTime: BigNumber.from(0),
          },
        ],
      });
    }
  }
  return lendersInfo;
};

export const getRALBTWithActions = async (
  actionCallerSigner: Signer,
  actions: IAction[]
): Promise<void> => {
  // Given
  const {actionVerifierContract, rALBTContract, stakerMedalNFTContract} =
    await getContracts();

  const lendersDetails = actionsPerLender(actions);

  for (let index = 0; index < lendersDetails.length; index++) {
    const lenderInfo = lendersDetails[index];
    const lenderAddress = lenderInfo.account;

    lenderInfo.stakingLevel = await stakerMedalNFTContract.getLevelOfStaker(
      lenderAddress
    );

    lenderInfo.balanceBefore = await rALBTContract.balanceOf(lenderAddress);

    for (let index = 0; index < lenderInfo.actions.length; index++) {
      lenderInfo.actions[index].lastEpoch =
        await actionVerifierContract.lastEpochActionDonePerAccount(
          lenderAddress,
          web3.utils.keccak256(lenderInfo.actions[index].name)
        );
      lenderInfo.actions[index].rewardPerActionLevel =
        await actionVerifierContract.rewardPerActionPerLevel(
          web3.utils.keccak256(lenderInfo.actions[index].name),
          lenderInfo.stakingLevel
        );
      lenderInfo.actions[index].rewardPerActionPerLevelAfterFirstTime =
        await actionVerifierContract.rewardPerActionPerLevelAfterFirstTime(
          web3.utils.keccak256(lenderInfo.actions[index].name),
          lenderInfo.stakingLevel
        );
    }
    lendersDetails[index] = lenderInfo;
  }
  // Action Caller info
  const actionCallerAddress = await actionCallerSigner.getAddress();
  const stakingLevelActionCaller =
    await stakerMedalNFTContract.getLevelOfStaker(actionCallerAddress);
  const balanceRALBTBeforeActionsActionCaller = await rALBTContract.balanceOf(
    actionCallerAddress
  );
  const rewardPerActionProvisionPerLevel =
    await actionVerifierContract.rewardPerActionProvisionPerLevel(
      stakingLevelActionCaller
    );

  const getNewSignature = async (action: IAction) => {
    const newSignature = await getSignature(
      action.actionName,
      action.answer,
      action.account,
      action.referralId,
      actionVerifierContract.address,
      web3
    );
    return newSignature;
  };

  const signatures = [];
  for (let index = 0; index < actions.length; index++) {
    await increaseTime(actionCallerSigner.provider, 1 * 24 * 60 * 60); // 1 day
    const action = actions[index];
    signatures.push(await getNewSignature(action));
  }

  // When
  const provideRewardsForActions = await actionVerifierContract
    .connect(actionCallerSigner)
    .provideRewardsForActions(actions, signatures);

  const balanceRALBTAfterActionsActionCaller = await rALBTContract.balanceOf(
    actionCallerAddress
  );

  // Get new balances of lenders
  for (let index = 0; index < lendersDetails.length; index++) {
    const lenderInfo = lendersDetails[index];
    const balanceRALBTAfterActions = await rALBTContract.balanceOf(
      lenderInfo.account
    );
    let rewards = lenderInfo.actions
      .map((act) => {
        let reward = act.lastEpoch.eq(0)
          ? act.rewardPerActionLevel
          : act.rewardPerActionPerLevelAfterFirstTime;
        // If more than one action add rewardPerActionPerLevelAfterFirstTime
        reward = reward.add(
          act.rewardPerActionPerLevelAfterFirstTime.mul(
            act.amountOfTimes.sub(1)
          )
        );
        return reward;
      })
      .reduce((reward1, reward2) => reward1.add(reward2));

    if (lenderInfo.account === actionCallerAddress) {
      rewards = rewards.add(
        rewardPerActionProvisionPerLevel.mul(actions.length)
      );
    }

    expect(balanceRALBTAfterActions).to.be.equal(
      lenderInfo.balanceBefore.add(rewards)
    );
  }
  // Then
  // Events
  await provideRewardsForActions.wait();
  expect(provideRewardsForActions).to.emit(
    actionVerifierContract,
    'ActionsProvided'
  );
  expect(provideRewardsForActions).to.emit(
    actionVerifierContract,
    'EpochChanged'
  );
  // Correct balance of rALBT
  if (
    lendersDetails.findIndex((act) => act.account === actionCallerAddress) < 0
  ) {
    // Only if action caller dont send any action
    expect(balanceRALBTAfterActionsActionCaller).to.be.equal(
      balanceRALBTBeforeActionsActionCaller.add(
        rewardPerActionProvisionPerLevel.mul(actions.length)
      )
    );
  }

  // expect(balanceRALBTAfterActions).to.be.equal(lenderReward());
};
export const batchGetRALBTWithActions = async (
  getRALBTData: IGetRALBTData[],
  deployerSigner: Signer
): Promise<void> => {
  //  data = {lenderSigner: any, actionCallerSigner: any}
  for (let i = 0; i < getRALBTData.length; i++) {
    await increaseTime(deployerSigner.provider, 1 * 24 * 60 * 60); // 1 day
    await getRALBTWithActions(
      getRALBTData[i].actionCallerSigner,
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
): Promise<void> => {
  // When
  const {
    escrowContract,
    rALBTContract,
    investmentContract,
  } = await getContracts();

  const lenderAddress = await lenderSigner.getAddress();

  const rAlbtPerLotteryNumber =
    await investmentContract.rAlbtPerLotteryNumber();
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
      await investmentContract.rAlbtPerLotteryNumber();
    const lotteryNumbersForImmediateTicket =
      await investmentContract.lotteryNumbersForImmediateTicket();
    let totalLotteryNumbersForLender = (
      await rALBTContract.balanceOf(lenderAddress)
    ).div(rALBTPerLotteryNumber);
    let immediateTicketsLender = BigNumber.from(0);
    let ticketsRemaining = await investmentContract.ticketsRemaining(
      investmentId
    );
    const totalLotteryNumbersPerInvestment =
      await investmentContract.totalLotteryNumbersPerInvestment(investmentId);
    const partitionsRequestedBefore = (
      await investmentContract.investmentDetails(investmentId)
    ).partitionsRequested;

    // When
    await investmentContract
      .connect(lenderSigner)
      .showInterestForInvestment(investmentId, numberOfPartitions);

    const partitionsRequestedAfter = (
      await investmentContract.investmentDetails(investmentId)
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
            await investmentContract.ticketsWonPerAddress(
              investmentId,
              lenderAddress
            )
          ).eq(immediateTicketsLender)
        ).to.be.true;
        const remaining = await investmentContract.ticketsRemaining(
          investmentId
        );
        expect(remaining.eq(ticketsRemaining.sub(immediateTicketsLender))).to.be
          .true;
        ticketsRemaining = remaining.sub(immediateTicketsLender);
      }
    }
    expect(
      (
        await investmentContract.remainingTicketsPerAddress(
          investmentId,
          lenderAddress
        )
      ).eq(numberOfPartitions.sub(immediateTicketsLender))
    ).to.be.true;
    expect(
      (
        await investmentContract.totalLotteryNumbersPerInvestment(investmentId)
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
      investmentContract
        .connect(lenderSigner)
        .showInterestForInvestment(investmentId, numberOfPartitions),
      'Not eligible for lottery numbers'
    );

    throw new Error('A lender has enough rALBT to declareIntentionForBuy');
  }
};
export const batchDeclareIntentionForBuy = async (data: IShowInterestData[]): Promise<void> => {
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
): Promise<void> => {
  const {
    governanceContract,
    fundingNFTContract,
    investmentContract,
  } = await getContracts();

  // When
  const lotteryStarted = await governanceContract
    .connect(superDelegatorSigner)
    .checkCronjobs();

  const projectStatusAfter = await investmentContract.projectStatus(
    investmentId
  );

  const investmentDetailsLotteryStarted =
    await investmentContract.investmentDetails(investmentId);

  // Then
  // Events
  expect(lotteryStarted)
    .to.emit(investmentContract, 'ProjectStarted')
    .withArgs(investmentId);

  // Correct lottery status
  expect(projectStatusAfter.toString()).to.be.equal(ProjectStatusTypes.STARTED);
  // Correct investment details
  expect(investmentDetailsLotteryStarted.startingDate).to.be.equal(
    await getTransactionTimestamp(lotteryStarted.hash)
  );

  // Run Lottery
  // When
  const runLottery = await investmentContract
    .connect(lotteryRunnerSigner)
    .executeLotteryRun(investmentId);

  const ticketsRemainingAfterRunLottery =
    await investmentContract.ticketsRemaining(investmentId);

  const projectStatusTypesAfterRunLottery =
    await investmentContract.projectStatus(investmentId);

  const isPauseFundingNFTTransferAfterRunLottey =
    await fundingNFTContract.transfersPaused(investmentId);

  // Then
  // Events
  expect(runLottery)
    .to.emit(investmentContract, 'LotteryExecuted')
    .withArgs(investmentId);
  expect(runLottery)
    .to.emit(investmentContract, 'ProjectSettled')
    .withArgs(investmentId);
  expect(runLottery)
    .to.emit(fundingNFTContract, 'TransfersResumed')
    .withArgs(investmentId);
  // Correct tickets remaining
  expect(ticketsRemainingAfterRunLottery).to.be.equal(0);
  // Correct status
  expect(projectStatusTypesAfterRunLottery.toString()).to.be.equal(
    ProjectStatusTypes.SETTLED
  );
  // Unpause token
  expect(isPauseFundingNFTTransferAfterRunLottey).to.be.false;
};
export const batchRunLottery = async (
  data: IRunLotteryData[],
  superDelegatorSigner: Signer
): Promise<void> => {
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
): Promise<void> => {
  const {
    fundingNFTContract,
    escrowContract,
    investmentContract,
  } = await getContracts();

  const lenderAddress = await lenderSigner.getAddress();

  const ticketsRemaining = await investmentContract.ticketsRemaining(
    investmentId
  );

  if (ticketsRemaining.eq(0)) {
    // Given
    const ticketsWonBeforeWithdraw =
      await investmentContract.ticketsWonPerAddress(
        investmentId,
        lenderAddress
      );
    const lockedTicketsForSpecificInvestmentBeforeWithdraw =
      await investmentContract.lockedNftsForSpecificInvestmentPerAddress(
        investmentId,
        lenderAddress
      );
    const lockedTicketsBeforeWithdraw =
      await investmentContract.lockedNftsPerAddress(lenderAddress);
    const balanceFundingNFTTokenBeforeWithdraw =
      await fundingNFTContract.balanceOf(
        lenderAddress,
        investmentId.toNumber()
      );
    const ticketsRemainBeforeWithdraw =
      await investmentContract.remainingTicketsPerAddress(
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
      withdrawInvestmentTickets = await investmentContract
        .connect(lenderSigner)
        .convertInvestmentTicketsToNfts(investmentId);
      await fundingNFTContract
        .connect(lenderSigner)
        .setApprovalForAll(escrowContract.address, true);

      await investmentContract
        .connect(lenderSigner)
        .lockInvestmentNfts(investmentId, amountTicketsToBlock);
    }
    const ticketsWonAfterWithdraw =
      await investmentContract.ticketsWonPerAddress(
        investmentId,
        lenderAddress
      );
    const lockedTicketsForSpecificInvestmentAfterWithdraw =
      await investmentContract.lockedNftsForSpecificInvestmentPerAddress(
        investmentId,
        lenderAddress
      );
    const lockedTicketsAfterWithdraw =
      await investmentContract.lockedNftsPerAddress(lenderAddress);
    const balanceFundingNFTTokenAfterWithdraw =
      await fundingNFTContract.balanceOf(lenderAddress, investmentId);
    const ticketsRemainAfterWithdraw =
      await investmentContract.remainingTicketsPerAddress(
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
      .to.emit(investmentContract, 'ConvertInvestmentTickets')
      .withArgs(
        investmentId,
        await lenderSigner.getAddress(),
        ticketsWonBeforeWithdraw
      );
    // LotteryLoserClaimedFunds
    if (ticketsRemainBeforeWithdraw.gt(0)) {
      expect(withdrawInvestmentTickets)
        .to.emit(investmentContract, 'LotteryLoserClaimedFunds')
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
  data: IFunderClaimRewardData[]
): Promise<void> => {
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
): Promise<void> => {
  // Given
  const {
    fundingNFTContract,
    escrowContract,
    investmentContract,
  } = await getContracts();
  const lenderAddress = await lenderSigner.getAddress();
  const investmentTokensPerTicket =
    await investmentContract.investmentTokensPerTicket(investmentId);
  const balanceFundingNFTTokenBeforeExchange =
    await fundingNFTContract.balanceOf(lenderAddress, investmentId.toNumber());
  const balanceOfInvestmentTokenBeforeExchange =
    await investmentTokenContract.balanceOf(lenderAddress);

  const balanceOfInvestmentTokenBeforeExhangeEscrow =
    await investmentTokenContract.balanceOf(escrowContract.address);

  // When
  if (balanceFundingNFTTokenBeforeExchange.toNumber() > 0) {
    await expect(
      investmentContract
        .connect(lenderSigner)
        .convertNFTToInvestmentTokens(
          investmentId,
          balanceFundingNFTTokenBeforeExchange
        )
    )
      .to.emit(investmentContract, 'ConvertNFTToInvestmentTokens')
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
  data: IExchangeNFTForInvestmentTokenData[]
): Promise<void> => {
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
  const {lendingTokenContract, investmentContract} =
    await getContracts();
  // given
  const seekerInitialLendingBalance = await lendingTokenContract.balanceOf(
    await seekerSigner.getAddress()
  );
  const expectedAmount = (
    await investmentContract.investmentDetails(investmentId)
  ).totalAmountToBeRaised;

  // when
  await expect(
    investmentContract.connect(seekerSigner).withdrawInvestment(investmentId)
  )
    .to.emit(investmentContract, 'seekerWithdrawInvestment')
    .withArgs(investmentId, expectedAmount);

  const seekerFinalLendingBalance = await lendingTokenContract.balanceOf(
    await seekerSigner.getAddress()
  );
  const investmentWithdrawn = await investmentContract.investmentWithdrawn(
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
  seekerClaimsFundingData: ISeekerClaimsFunding[]
): Promise<void> => {
  for (let i = 0; i < seekerClaimsFundingData.length; i++) {
    await seekerClaimsFunding(
      seekerClaimsFundingData[i].investmentId,
      seekerClaimsFundingData[i].seekerSigner
    );
  }
};
