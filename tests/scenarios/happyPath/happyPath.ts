import {BASE_AMOUNT} from '../../helpers/constants';
import {ethers, web3} from 'hardhat';
import {BigNumber, Contract} from 'ethers';
import chai, {expect} from 'chai';
import {solidity} from 'ethereum-waffle';
import {StakingType, InvestmentStatus} from '../../helpers/registryEnums';
import {getSignature} from '../../helpers/utils';
import {getTransactionTimestamp, increaseTime} from '../../helpers/time';
import {CronjobType} from '../../helpers/governanceEnums';
const {expectRevert} = require('@openzeppelin/test-helpers');

chai.use(solidity);

export default async function suite() {
  it('should do a full flow', async function () {
    //1) Seeker publishes Investment
    // Given
    const amountOfInvestmentTokens = ethers.utils.parseEther('1000');
    const totalAmountRequested = ethers.utils.parseEther('200');
    const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

    const investmentId = await this.registryContract.totalInvestments();
    const totalInvestmentsBefore =
      await this.registryContract.totalInvestments();
    const balanceInvestmentTokenSeekerBefore =
      await this.investmentTokenContract.balanceOf(this.seeker);
    const balanceInvestmentTokenEscrowBefore =
      await this.investmentTokenContract.balanceOf(this.escrowContract.address);
    const totalApprovalRequestsBefore =
      await this.governanceContract.totalApprovalRequests();

    const amountOfPartitions = totalAmountRequested.div(
      ethers.utils.parseEther(BASE_AMOUNT.toString())
    );
    // When
    const requestInvestment = await this.registryContract
      .connect(this.seekerSigner)
      .requestInvestment(
        this.investmentTokenContract.address,
        amountOfInvestmentTokens,
        this.lendingTokenContract.address,
        totalAmountRequested,
        ipfsHash
      );

    const investmentDetails = await this.registryContract.investmentDetails(
      investmentId
    );
    const investmentSeeker = await this.registryContract.investmentSeeker(
      investmentId
    );
    const totalInvestmentsAfter =
      await this.registryContract.totalInvestments();
    const balanceInvestmentTokenSeekerAfter =
      await this.investmentTokenContract.balanceOf(this.seeker);
    const balanceInvestmentTokenEscrowAfter =
      await this.investmentTokenContract.balanceOf(this.escrowContract.address);
    const balanceFundingNftEscrowAfter =
      await this.fundingNFTContract.balanceOf(
        this.escrowContract.address,
        investmentId
      );
    const investmentTokensPerTicket =
      await this.registryContract.investmentTokensPerTicket(investmentId);
    const isPauseFundingNFTTransfer =
      await this.fundingNFTContract.transfersPaused(investmentId);
    const totalApprovalRequestsAfter =
      await this.governanceContract.totalApprovalRequests();
    const approvalRequest = await this.governanceContract.approvalRequests(
      totalApprovalRequestsBefore
    );
    const investmentStatus = await this.registryContract.investmentStatus(
      investmentId
    );

    // Then
    // Events
    expect(requestInvestment)
      .to.emit(this.fundingNFTContract, 'TransfersPaused')
      .withArgs(investmentId);
    expect(requestInvestment)
      .to.emit(this.governanceContract, 'ApprovalRequested')
      .withArgs(investmentId, this.registryContract.address);
    expect(requestInvestment)
      .to.emit(this.registryContract, 'InvestmentRequested')
      .withArgs(investmentId, this.seeker, totalAmountRequested);

    // Correct investment details
    expect(investmentDetails.investmentId).to.be.equal(investmentId);
    expect(investmentDetails.investmentToken).to.be.equal(
      this.investmentTokenContract.address
    );
    expect(investmentDetails.investmentTokensAmount).to.be.equal(
      amountOfInvestmentTokens
    );
    expect(investmentDetails.totalAmountToBeRaised).to.be.equal(
      totalAmountRequested
    );
    expect(investmentDetails.extraInfo).to.be.equal(ipfsHash);
    expect(investmentDetails.totalPartitionsToBePurchased).to.be.equal(
      amountOfPartitions
    );
    expect(investmentDetails.lendingToken).to.be.equal(
      this.lendingTokenContract.address
    );
    // Correct investment seeker
    expect(investmentSeeker).to.be.equal(this.seeker);
    // Correct total of investments
    expect(totalInvestmentsAfter.toNumber()).to.be.equal(
      totalInvestmentsBefore.toNumber() + 1
    );
    // Correct balances
    expect(balanceInvestmentTokenSeekerAfter).to.be.equal(
      balanceInvestmentTokenSeekerBefore.sub(amountOfInvestmentTokens)
    );
    expect(balanceInvestmentTokenEscrowAfter).to.be.equal(
      balanceInvestmentTokenEscrowBefore.add(amountOfInvestmentTokens)
    );
    expect(balanceFundingNftEscrowAfter).to.be.equal(amountOfPartitions);
    expect(investmentTokensPerTicket).to.be.equal(
      amountOfInvestmentTokens.div(amountOfPartitions)
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

    //2) SuperGovernance approves Investment
    // Given
    const totalCronjobsBeforeApprove =
      await this.governanceContract.totalCronjobs();
    const cronjobsListBeforeApprove =
      await this.governanceContract.cronjobList();

    // When
    const approveInvestment = await this.governanceContract
      .connect(this.superDelegatorSigner)
      .superVoteForRequest(investmentId, true);

    const investmentStatusAfterApprove =
      await this.registryContract.investmentStatus(investmentId);
    const investmentDetailsAfterApprove =
      await this.registryContract.investmentDetails(investmentId);
    const ticketsRemainingAfterApprove =
      await this.registryContract.ticketsRemaining(investmentId);
    const totalCronjobsAfterApprove =
      await this.governanceContract.totalCronjobs();
    const cronjobsAfterApprove = await this.governanceContract.cronjobs(
      totalCronjobsAfterApprove
    );
    const cronjobsListAfterApprove =
      await this.governanceContract.cronjobList();
    const approvalRequestAfterApprove =
      await this.governanceContract.approvalRequests(
        totalApprovalRequestsBefore
      );

    // Then
    // Events
    expect(approveInvestment)
      .to.emit(this.registryContract, 'InvestmentApproved')
      .withArgs(investmentId);
    expect(approveInvestment)
      .to.emit(this.governanceContract, 'VotedForRequest')
      .withArgs(investmentId, investmentId, true, this.superDelegator);

    // Correct investment status
    expect(String(investmentStatusAfterApprove)).to.be.equal(
      String(InvestmentStatus.APPROVED)
    );
    // Correct investment details
    expect(investmentDetailsAfterApprove.approvalDate).to.be.equal(
      await getTransactionTimestamp(approveInvestment.hash)
    );
    // Correct ticketsRemaining
    expect(ticketsRemainingAfterApprove).to.be.equal(amountOfPartitions);
    // Correct total of cronJobs
    expect(totalCronjobsAfterApprove.toNumber()).to.be.equal(
      totalCronjobsBeforeApprove.toNumber() + 1
    );
    // Correct cronJob
    expect(cronjobsAfterApprove.cronjobType.toString()).to.be.equal(
      CronjobType.INVESTMENT
    );
    expect(cronjobsAfterApprove.externalId).to.be.equal(investmentId);
    // Correct list of cronJob
    expect(cronjobsListAfterApprove.head).to.be.equal(
      cronjobsListBeforeApprove.head
    );
    expect(cronjobsListAfterApprove.tail.toNumber()).to.be.equal(
      cronjobsListBeforeApprove.tail.toNumber() + 1
    );
    expect(cronjobsListAfterApprove.size.toNumber()).to.be.equal(
      cronjobsListBeforeApprove.size.toNumber() + 1
    );
    // Verify the node
    // Correct approval request
    expect(
      approvalRequestAfterApprove.approvalsProvided.toString()
    ).to.be.equal('1');
    expect(approvalRequestAfterApprove.isApproved).to.be.true;
    expect(approvalRequestAfterApprove.isProcessed).to.be.true;

    //3) 4 Funders stake, one for each tier
    // Given
    const reputationalStakingTypeAmount1 =
      await this.stakingContract.reputationalStakingTypeAmounts(1);
    const reputationalStakingTypeAmount2 =
      await this.stakingContract.reputationalStakingTypeAmounts(2);
    const reputationalStakingTypeAmount3 =
      await this.stakingContract.reputationalStakingTypeAmounts(3);

    const stakingTypeAmount1 = await this.stakingContract.stakingTypeAmounts(
      StakingType.STAKER_LVL_1
    );
    const stakingTypeAmount2 = await this.stakingContract.stakingTypeAmounts(
      StakingType.STAKER_LVL_2
    );
    const stakingTypeAmount3 = await this.stakingContract.stakingTypeAmounts(
      StakingType.STAKER_LVL_3
    );

    const balanceALBTStaker1BeforeStake = await this.ALBTContract.balanceOf(
      this.lender1
    );
    const balanceALBTStaker2BeforeStake = await this.ALBTContract.balanceOf(
      this.lender2
    );
    const balanceALBTStaker3BeforeStake = await this.ALBTContract.balanceOf(
      this.lender3
    );
    const balanceALBTStakingContractBeforeStake =
      await this.ALBTContract.balanceOf(this.stakingContract.address);

    const totalSupplyBeforeStake = await this.stakingContract.totalSupply();

    const balanceStakingStaker1BeforeStake =
      await this.stakingContract.getBalance(this.lender1);
    const balanceStakingStaker2BeforeStake =
      await this.stakingContract.getBalance(this.lender2);
    const balanceStakingStaker3BeforeStake =
      await this.stakingContract.getBalance(this.lender3);

    const amountToStake1 = stakingTypeAmount1.sub(
      balanceStakingStaker1BeforeStake
    );
    const amountToStake2 = stakingTypeAmount2.sub(
      balanceStakingStaker2BeforeStake
    );
    const amountToStake3 = stakingTypeAmount3.sub(
      balanceStakingStaker3BeforeStake
    );

    // When
    await expect(
      this.stakingContract
        .connect(this.lender1Signer)
        .stake(StakingType.STAKER_LVL_1)
    )
      .to.emit(this.stakingContract, 'Staked')
      .withArgs(this.lender1, amountToStake1);

    await expect(
      this.stakingContract
        .connect(this.lender2Signer)
        .stake(StakingType.STAKER_LVL_2)
    )
      .to.emit(this.stakingContract, 'Staked')
      .withArgs(this.lender2, amountToStake2);

    await expect(
      this.stakingContract
        .connect(this.lender3Signer)
        .stake(StakingType.STAKER_LVL_3)
    )
      .to.emit(this.stakingContract, 'Staked')
      .withArgs(this.lender3, amountToStake3);

    const balanceRALBTAfterStake1 = await this.rALBTContract.balanceOf(
      this.lender1
    );
    const balanceRALBTAfterStake2 = await this.rALBTContract.balanceOf(
      this.lender2
    );
    const balanceRALBTAfterStake3 = await this.rALBTContract.balanceOf(
      this.lender3
    );

    const balanceStaker1Medal1 = await this.stakerMedalNFTContract.balanceOf(
      this.lender1,
      1
    );
    const balanceStaker1Medal2 = await this.stakerMedalNFTContract.balanceOf(
      this.lender1,
      2
    );
    const balanceStaker1Medal3 = await this.stakerMedalNFTContract.balanceOf(
      this.lender1,
      3
    );

    const balanceStaker2Medal1 = await this.stakerMedalNFTContract.balanceOf(
      this.lender2,
      1
    );
    const balanceStaker2Medal2 = await this.stakerMedalNFTContract.balanceOf(
      this.lender2,
      2
    );
    const balanceStaker2Medal3 = await this.stakerMedalNFTContract.balanceOf(
      this.lender2,
      3
    );

    const balanceStaker3Medal1 = await this.stakerMedalNFTContract.balanceOf(
      this.lender3,
      1
    );
    const balanceStaker3Medal2 = await this.stakerMedalNFTContract.balanceOf(
      this.lender3,
      2
    );
    const balanceStaker3Medal3 = await this.stakerMedalNFTContract.balanceOf(
      this.lender3,
      3
    );

    const balanceALBTStaker1AfterStake = await this.ALBTContract.balanceOf(
      this.lender1
    );
    const balanceALBTStaker2AfterStake = await this.ALBTContract.balanceOf(
      this.lender2
    );
    const balanceALBTStaker3AfterStake = await this.ALBTContract.balanceOf(
      this.lender3
    );
    const balanceALBTStakingContractAfterStake =
      await this.ALBTContract.balanceOf(this.stakingContract.address);

    const totalSupplyAfterStake = await this.stakingContract.totalSupply();

    const balanceStakingStaker1AfterStake =
      await this.stakingContract.getBalance(this.lender1);
    const balanceStakingStaker2AfterStake =
      await this.stakingContract.getBalance(this.lender2);
    const balanceStakingStaker3AfterStake =
      await this.stakingContract.getBalance(this.lender3);

    const levelOfStakerAfter1 =
      await this.stakerMedalNFTContract.getLevelOfStaker(this.lender1);
    const levelOfStakerAfter2 =
      await this.stakerMedalNFTContract.getLevelOfStaker(this.lender2);
    const levelOfStakerAfter3 =
      await this.stakerMedalNFTContract.getLevelOfStaker(this.lender3);

    // Then
    // Correct rALBT balance
    expect(balanceRALBTAfterStake1).to.be.equal(reputationalStakingTypeAmount1);
    expect(balanceRALBTAfterStake2).to.be.equal(reputationalStakingTypeAmount2);
    expect(balanceRALBTAfterStake3).to.be.equal(reputationalStakingTypeAmount3);

    // Correct staker medal
    expect(balanceStaker1Medal1).to.be.equal(1);
    expect(balanceStaker1Medal2).to.be.equal(0);
    expect(balanceStaker1Medal3).to.be.equal(0);

    expect(balanceStaker2Medal1).to.be.equal(0);
    expect(balanceStaker2Medal2).to.be.equal(1);
    expect(balanceStaker2Medal3).to.be.equal(0);

    expect(balanceStaker3Medal1).to.be.equal(0);
    expect(balanceStaker3Medal2).to.be.equal(0);
    expect(balanceStaker3Medal3).to.be.equal(1);

    expect(levelOfStakerAfter1).to.be.equal(1);
    expect(levelOfStakerAfter2).to.be.equal(2);
    expect(levelOfStakerAfter3).to.be.equal(3);

    // Correct ALBT balance
    expect(balanceALBTStaker1AfterStake).to.be.equal(
      balanceALBTStaker1BeforeStake.sub(amountToStake1)
    );
    expect(balanceALBTStaker2AfterStake).to.be.equal(
      balanceALBTStaker2BeforeStake.sub(amountToStake2)
    );
    expect(balanceALBTStaker3AfterStake).to.be.equal(
      balanceALBTStaker3BeforeStake.sub(amountToStake3)
    );
    expect(balanceALBTStakingContractAfterStake).to.be.equal(
      balanceALBTStakingContractBeforeStake.add(
        amountToStake1.add(amountToStake2).add(amountToStake3)
      )
    );

    // Correct total supply
    expect(totalSupplyAfterStake).to.be.equal(
      totalSupplyBeforeStake.add(
        amountToStake1.add(amountToStake2).add(amountToStake3)
      )
    );

    // Correct staking balance
    expect(balanceStakingStaker1AfterStake).to.be.equal(
      balanceStakingStaker1BeforeStake.add(amountToStake1)
    );
    expect(balanceStakingStaker2AfterStake).to.be.equal(
      balanceStakingStaker2BeforeStake.add(amountToStake2)
    );
    expect(balanceStakingStaker3AfterStake).to.be.equal(
      balanceStakingStaker3BeforeStake.add(amountToStake3)
    );

    //Simulates lender4 has rALBT from other methods besides staking

    // Add new action
    // Given
    const addressZero = '0x0000000000000000000000000000000000000000';
    const actions = [
      {
        account: this.lender4,
        actionName: 'Wallet Connect',
        answer: 'Yes',
        referralId: 0,
      },
    ];
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
      this.actionVerifierContract
        .connect(this.deployerSigner)
        .importAction(
          actions[0].actionName,
          reputationalAlbtRewardsPerLevel,
          reputationalAlbtRewardsPerLevelAfterFirstTime,
          2,
          addressZero
        )
    )
      .to.emit(this.actionVerifierContract, 'ActionImported')
      .withArgs(actions[0].actionName);

    // Reward per action
    const rewardPerActionLevel0 =
      await this.actionVerifierContract.rewardPerActionPerLevel(
        web3.utils.keccak256(actions[0].actionName),
        0
      );
    const rewardPerActionLevel1 =
      await this.actionVerifierContract.rewardPerActionPerLevel(
        web3.utils.keccak256(actions[0].actionName),
        1
      );
    const rewardPerActionLevel2 =
      await this.actionVerifierContract.rewardPerActionPerLevel(
        web3.utils.keccak256(actions[0].actionName),
        2
      );
    const rewardPerActionLevel3 =
      await this.actionVerifierContract.rewardPerActionPerLevel(
        web3.utils.keccak256(actions[0].actionName),
        3
      );

    // Reward per action after first time
    const rewardPerActionPerLevelAfterFirstTime0 =
      await this.actionVerifierContract.rewardPerActionPerLevelAfterFirstTime(
        web3.utils.keccak256(actions[0].actionName),
        0
      );
    const rewardPerActionPerLevelAfterFirstTime1 =
      await this.actionVerifierContract.rewardPerActionPerLevelAfterFirstTime(
        web3.utils.keccak256(actions[0].actionName),
        1
      );
    const rewardPerActionPerLevelAfterFirstTime2 =
      await this.actionVerifierContract.rewardPerActionPerLevelAfterFirstTime(
        web3.utils.keccak256(actions[0].actionName),
        2
      );
    const rewardPerActionPerLevelAfterFirstTime3 =
      await this.actionVerifierContract.rewardPerActionPerLevelAfterFirstTime(
        web3.utils.keccak256(actions[0].actionName),
        3
      );

    const minimumLevelForActionProvision =
      await this.actionVerifierContract.minimumLevelForActionProvision(
        web3.utils.keccak256(actions[0].actionName)
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

    // Get rAlbt
    // Given
    const balanceRALBTBeforeActions3 = await this.rALBTContract.balanceOf(
      this.lender3
    );
    const balanceRALBTBeforeActions4 = await this.rALBTContract.balanceOf(
      this.lender4
    );
    const rewardPerActionProvisionPerLevel3 = await this.actionVerifierContract
      .connect(this.lender3Signer)
      .rewardPerActionProvisionPerLevel(StakingType.STAKER_LVL_3);

    const signature = await getSignature(
      actions[0].actionName,
      actions[0].answer,
      actions[0].account,
      actions[0].referralId,
      this.actionVerifierContract.address,
      web3
    );

    const signatures = [signature];

    // Then
    const amountOfActions = 55;
    for (let i = 0; i < amountOfActions; i++) {
      await increaseTime(this.deployerSigner.provider, 1 * 24 * 60 * 60); // 1 day

      const provideRewardsForActions = await this.actionVerifierContract
        .connect(this.lender3Signer)
        .provideRewardsForActions(actions, signatures);

      // Add events
      // emit ActionsProvided(actions, signatures, msg.sender);
      // emit EpochChanged(currentEpoch, endingTimestampForCurrentEpoch);
    }

    const balanceRALBTAfterActions3 = await this.rALBTContract.balanceOf(
      this.lender3
    );
    const balanceRALBTAfterActions4 = await this.rALBTContract.balanceOf(
      this.lender4
    );

    // Then
    // Correct balance of rALBT
    expect(balanceRALBTAfterActions3).to.be.equal(
      balanceRALBTBeforeActions3.add(
        rewardPerActionProvisionPerLevel3.mul(amountOfActions)
      )
    );
    expect(balanceRALBTAfterActions4).to.be.equal(
      balanceRALBTBeforeActions4
        .add(rewardPerActionLevel0)
        .add(rewardPerActionPerLevelAfterFirstTime0.mul(amountOfActions - 1))
    );

    //4) Funders declare their intention to buy a partition (effectively depositing their funds)
    // Given
    const numberOfPartitions = BigNumber.from(6);
    const amountOfLendingTokens = numberOfPartitions.mul(
      ethers.utils.parseEther(BASE_AMOUNT + '')
    );
    const initLenderLendingTokenBalance1 =
      await this.lendingTokenContract.balanceOf(this.lender1);
    const initLenderLendingTokenBalance2 =
      await this.lendingTokenContract.balanceOf(this.lender2);
    const initLenderLendingTokenBalance3 =
      await this.lendingTokenContract.balanceOf(this.lender3);
    const initLenderLendingTokenBalance4 =
      await this.lendingTokenContract.balanceOf(this.lender4);
    const initEscrowLendingTokenBalance =
      await this.lendingTokenContract.balanceOf(this.escrowContract.address);

    const rALBTPerLotteryNumber =
      await this.registryContract.rAlbtPerLotteryNumber();
    const lotteryNumbersForImmediateTicket =
      await this.registryContract.lotteryNumbersForImmediateTicket();
    let totalLotteryNumbersForLender1 = (
      await this.rALBTContract.balanceOf(this.lender1Signer.address)
    ).div(rALBTPerLotteryNumber);
    let totalLotteryNumbersForLender2 = (
      await this.rALBTContract.balanceOf(this.lender2Signer.address)
    ).div(rALBTPerLotteryNumber);
    let totalLotteryNumbersForLender3 = (
      await this.rALBTContract.balanceOf(this.lender3Signer.address)
    ).div(rALBTPerLotteryNumber);
    let totalLotteryNumbersForLender4 = (
      await this.rALBTContract.balanceOf(this.lender4Signer.address)
    ).div(rALBTPerLotteryNumber);

    let immediateTicketsLender1 = BigNumber.from(0);
    let immediateTicketsLender2 = BigNumber.from(0);
    let immediateTicketsLender3 = BigNumber.from(0);
    let immediateTicketsLender4 = BigNumber.from(0);

    let ticketsRemaining = await this.registryContract.ticketsRemaining(
      investmentId
    );
    let totalLotteryNumbersPerInvestment =
      await this.registryContract.totalLotteryNumbersPerInvestment(
        investmentId
      );

    // When
    await this.registryContract
      .connect(this.lender1Signer)
      .showInterestForInvestment(investmentId, numberOfPartitions);
    //check number of partitions requested for this investment
    //after each call to showInterestForInvestment
    expect(
      (await this.registryContract.investmentDetails(investmentId))
        .partitionsRequested
    ).to.be.equal(numberOfPartitions);
    //then check for immediate tickets
    if (totalLotteryNumbersForLender1.gt(lotteryNumbersForImmediateTicket)) {
      // these cases do NOT take into account previously locked tokens, that case has to be tested in a different way
      // this is only valid for Happy path
      const rest = totalLotteryNumbersForLender1
        .sub(1)
        .mod(lotteryNumbersForImmediateTicket)
        .add(1);
      immediateTicketsLender1 = totalLotteryNumbersForLender1
        .sub(rest)
        .div(lotteryNumbersForImmediateTicket);

      totalLotteryNumbersForLender1 = rest;
      if (immediateTicketsLender1.gt(0)) {
        expect(
          (
            await this.registryContract.ticketsWonPerAddress(
              investmentId,
              this.lender1Signer.address
            )
          ).eq(immediateTicketsLender1)
        ).to.be.true;
        const remaining = await this.registryContract.ticketsRemaining(
          investmentId
        );
        expect(remaining.eq(ticketsRemaining.sub(immediateTicketsLender1))).to
          .be.true;
        ticketsRemaining = remaining.sub(immediateTicketsLender1);
      }
    }
    expect(
      (
        await this.registryContract.remainingTicketsPerAddress(
          investmentId,
          this.lender1Signer.address
        )
      ).eq(numberOfPartitions.sub(immediateTicketsLender1))
    ).to.be.true;
    expect(
      (
        await this.registryContract.totalLotteryNumbersPerInvestment(
          investmentId
        )
      ).eq(totalLotteryNumbersPerInvestment.add(totalLotteryNumbersForLender1))
    ).to.be.true;
    totalLotteryNumbersPerInvestment = totalLotteryNumbersPerInvestment.add(
      totalLotteryNumbersForLender1
    );

    await this.registryContract
      .connect(this.lender2Signer)
      .showInterestForInvestment(investmentId, numberOfPartitions);
    expect(
      (await this.registryContract.investmentDetails(investmentId))
        .partitionsRequested
    ).to.be.equal(numberOfPartitions.mul(2));
    if (totalLotteryNumbersForLender2.gt(lotteryNumbersForImmediateTicket)) {
      // these cases do NOT take into account previously locked tokens, that case has to be tested in a different way
      // this is only valid for Happy path
      const rest = totalLotteryNumbersForLender2
        .sub(1)
        .mod(lotteryNumbersForImmediateTicket)
        .add(1);
      immediateTicketsLender2 = totalLotteryNumbersForLender2
        .sub(rest)
        .div(lotteryNumbersForImmediateTicket);

      totalLotteryNumbersForLender2 = rest;
      if (immediateTicketsLender2.gt(0)) {
        expect(
          (
            await this.registryContract.ticketsWonPerAddress(
              investmentId,
              this.lender2Signer.address
            )
          ).eq(immediateTicketsLender2)
        ).to.be.true;
        const remaining = await this.registryContract.ticketsRemaining(
          investmentId
        );
        expect(
          remaining.eq(ticketsRemaining.sub(immediateTicketsLender2))
        ).to.be.true;
        ticketsRemaining = remaining.sub(immediateTicketsLender2);
      }
    }
    expect(
      (
        await this.registryContract.remainingTicketsPerAddress(
          investmentId,
          this.lender2Signer.address
        )
      ).eq(numberOfPartitions.sub(immediateTicketsLender2))
    ).to.be.true;
    expect(
      (
        await this.registryContract.totalLotteryNumbersPerInvestment(
          investmentId
        )
      ).eq(totalLotteryNumbersPerInvestment.add(totalLotteryNumbersForLender2))
    ).to.be.true;
    totalLotteryNumbersPerInvestment = totalLotteryNumbersPerInvestment.add(
      totalLotteryNumbersForLender2
    );

    await this.registryContract
      .connect(this.lender3Signer)
      .showInterestForInvestment(investmentId, numberOfPartitions);
    expect(
      (await this.registryContract.investmentDetails(investmentId))
        .partitionsRequested
    ).to.be.equal(numberOfPartitions.mul(3));
    if (totalLotteryNumbersForLender3.gt(lotteryNumbersForImmediateTicket)) {
      // these cases do NOT take into account previously locked tokens, that case has to be tested in a different way
      // this is only valid for Happy path
      const rest = totalLotteryNumbersForLender3
        .sub(1)
        .mod(lotteryNumbersForImmediateTicket)
        .add(1);
      immediateTicketsLender3 = totalLotteryNumbersForLender3
        .sub(rest)
        .div(lotteryNumbersForImmediateTicket);

      totalLotteryNumbersForLender3 = rest;
      if (immediateTicketsLender3.gt(0)) {
        expect(
          (
            await this.registryContract.ticketsWonPerAddress(
              investmentId,
              this.lender3Signer.address
            )
          ).eq(immediateTicketsLender3)
        ).to.be.true;
        const remaining = await this.registryContract.ticketsRemaining(
          investmentId
        );
        expect(
          remaining.eq(ticketsRemaining.sub(immediateTicketsLender3))
        ).to.be.true;
        ticketsRemaining = remaining.sub(immediateTicketsLender3);
      }
    }
    expect(
      (
        await this.registryContract.remainingTicketsPerAddress(
          investmentId,
          this.lender3Signer.address
        )
      ).eq(numberOfPartitions.sub(immediateTicketsLender3))
    ).to.be.true;
    expect(
      (
        await this.registryContract.totalLotteryNumbersPerInvestment(
          investmentId
        )
      ).eq(totalLotteryNumbersPerInvestment.add(totalLotteryNumbersForLender3))
    ).to.be.true;
    totalLotteryNumbersPerInvestment = totalLotteryNumbersPerInvestment.add(
      totalLotteryNumbersForLender3
    );

    await this.registryContract
      .connect(this.lender4Signer)
      .showInterestForInvestment(investmentId, numberOfPartitions);
    expect(
      (await this.registryContract.investmentDetails(investmentId))
        .partitionsRequested
    ).to.be.equal(numberOfPartitions.mul(4));
    if (totalLotteryNumbersForLender4.gt(lotteryNumbersForImmediateTicket)) {
      // these cases do NOT take into account previously locked tokens, that case has to be tested in a different way
      // this is only valid for Happy path
      const rest = totalLotteryNumbersForLender4
        .sub(1)
        .mod(lotteryNumbersForImmediateTicket)
        .add(1);
      immediateTicketsLender4 = totalLotteryNumbersForLender4
        .sub(rest)
        .div(lotteryNumbersForImmediateTicket);

      totalLotteryNumbersForLender4 = rest;
      if (immediateTicketsLender4.gt(0)) {
        expect(
          (
            await this.registryContract.ticketsWonPerAddress(
              investmentId,
              this.lender4Signer.address
            )
          ).eq(immediateTicketsLender4)
        ).to.be.true;
        const remaining = await this.registryContract.ticketsRemaining(
          investmentId
        );
        expect(
          remaining.eq(ticketsRemaining.sub(immediateTicketsLender4))
        ).to.be.true;
        ticketsRemaining = remaining.sub(immediateTicketsLender4);
      }
    }
    expect(
      (
        await this.registryContract.remainingTicketsPerAddress(
          investmentId,
          this.lender4Signer.address
        )
      ).eq(numberOfPartitions.sub(immediateTicketsLender4))
    ).to.be.true;
    expect(
      (
        await this.registryContract.totalLotteryNumbersPerInvestment(
          investmentId
        )
      ).eq(totalLotteryNumbersPerInvestment.add(totalLotteryNumbersForLender4))
    ).to.be.true;
    totalLotteryNumbersPerInvestment = totalLotteryNumbersPerInvestment.add(
      totalLotteryNumbersForLender4
    );

    const lenderLendingTokenBalanceAfter1 =
      await this.lendingTokenContract.balanceOf(this.lender1);
    const lenderLendingTokenBalanceAfter2 =
      await this.lendingTokenContract.balanceOf(this.lender2);
    const lenderLendingTokenBalanceAfter3 =
      await this.lendingTokenContract.balanceOf(this.lender3);
    const lenderLendingTokenBalanceAfter4 =
      await this.lendingTokenContract.balanceOf(this.lender4);
    const escrowLendingTokenBalanceAfter =
      await this.lendingTokenContract.balanceOf(this.escrowContract.address);

    // Then
    expect(lenderLendingTokenBalanceAfter1).to.be.equal(
      initLenderLendingTokenBalance1.sub(amountOfLendingTokens)
    );

    expect(lenderLendingTokenBalanceAfter2).to.be.equal(
      initLenderLendingTokenBalance2.sub(amountOfLendingTokens)
    );

    expect(lenderLendingTokenBalanceAfter3).to.be.equal(
      initLenderLendingTokenBalance3.sub(amountOfLendingTokens)
    );

    expect(lenderLendingTokenBalanceAfter4).to.be.equal(
      initLenderLendingTokenBalance4.sub(amountOfLendingTokens)
    );

    expect(escrowLendingTokenBalanceAfter).to.be.equal(
      initEscrowLendingTokenBalance
        .add(amountOfLendingTokens)
        .add(amountOfLendingTokens)
        .add(amountOfLendingTokens)
        .add(amountOfLendingTokens)
    );

    //5) The lottery is run when all the partitions have been covered
    // Change lottery status to started
    // Given
    const totalCronjobsBeforeLotteryStarted =
      await this.governanceContract.totalCronjobs();
    const cronjobsListBeforeLotteryStarted =
      await this.governanceContract.cronjobList();

    // When
    let lotteryStarted;
    for (let i = 0; i < 2; i++) {
      lotteryStarted = await this.governanceContract
        .connect(this.superDelegatorSigner)
        .checkCronjobs();
    }
    const investmentStatusAfter = await this.registryContract.investmentStatus(
      investmentId
    );
    const totalCronjobsAfterLotteryStarted =
      await this.governanceContract.totalCronjobs();
    const cronjobsAfterLotteryStarted = await this.governanceContract.cronjobs(
      totalCronjobsAfterLotteryStarted
    );
    const cronjobsListAfterLotteryStarted =
      await this.governanceContract.cronjobList();
    const investmentDetailsLotteryStarted =
      await this.registryContract.investmentDetails(investmentId);

    // Then
    // Events
    expect(lotteryStarted)
      .to.emit(this.registryContract, 'InvestmentStarted')
      .withArgs(investmentId);
    // Correct total of cronJobs
    expect(totalCronjobsAfterLotteryStarted).to.be.equal(
      totalCronjobsBeforeLotteryStarted.add(1)
    );
    // Correct cronJob added
    expect(cronjobsAfterLotteryStarted.cronjobType.toString()).to.be.equal(
      CronjobType.INVESTMENT
    );
    expect(cronjobsAfterLotteryStarted.externalId).to.be.equal(
      investmentId.sub(1)
    );
    // Correct list of cronJob
    expect(cronjobsListAfterLotteryStarted.head).to.be.equal(
      cronjobsListBeforeLotteryStarted.head.add(2)
    );
    expect(cronjobsListAfterLotteryStarted.tail).to.be.equal(
      cronjobsListBeforeLotteryStarted.head.add(2)
    );
    expect(cronjobsListAfterLotteryStarted.size.toNumber()).to.be.equal(1);
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
    const runLottery = await this.registryContract
      .connect(this.lender2Signer)
      .executeLotteryRun(investmentId);

    const ticketsRemainingAfterRunLottery =
      await this.registryContract.ticketsRemaining(investmentId);

    const investmentStatusAfterRunLottery =
      await this.registryContract.investmentStatus(investmentId);

    const isPauseFundingNFTTransferAfterRunLottey =
      await this.fundingNFTContract.transfersPaused(investmentId);

    // Then
    // Events
    expect(runLottery)
      .to.emit(this.registryContract, 'LotteryExecuted')
      .withArgs(investmentId);
    expect(runLottery)
      .to.emit(this.registryContract, 'InvestmentSettled')
      .withArgs(investmentId);
    expect(runLottery)
      .to.emit(this.fundingNFTContract, 'TransfersResumed')
      .withArgs(investmentId);
    // Correct tickets remaining
    expect(ticketsRemainingAfterRunLottery).to.be.equal(0);
    // Correct status
    expect(investmentStatusAfterRunLottery.toString()).to.be.equal(
      InvestmentStatus.SETTLED
    );
    // Unpause token
    expect(isPauseFundingNFTTransferAfterRunLottey).to.be.false;

    //6) FundingNFTs are minted and each Funder either receives their NFT or their funds back in case they did not win the lottery
    // Given
    const ticketsWonBeforeWithdraw1 =
      await this.registryContract.ticketsWonPerAddress(
        investmentId,
        this.lender1
      );
    const ticketsWonBeforeWithdraw2 =
      await this.registryContract.ticketsWonPerAddress(
        investmentId,
        this.lender2
      );
    const ticketsWonBeforeWithdraw3 =
      await this.registryContract.ticketsWonPerAddress(
        investmentId,
        this.lender3
      );
    const ticketsWonBeforeWithdraw4 =
      await this.registryContract.ticketsWonPerAddress(
        investmentId,
        this.lender4
      );

    const lockedTicketsForSpecificInvestmentBeforeWithdraw1 =
      await this.registryContract.lockedTicketsForSpecificInvestmentPerAddress(
        investmentId,
        this.lender1
      );
    const lockedTicketsForSpecificInvestmentBeforeWithdraw2 =
      await this.registryContract.lockedTicketsForSpecificInvestmentPerAddress(
        investmentId,
        this.lender2
      );
    const lockedTicketsForSpecificInvestmentBeforeWithdraw3 =
      await this.registryContract.lockedTicketsForSpecificInvestmentPerAddress(
        investmentId,
        this.lender3
      );
    const lockedTicketsForSpecificInvestmentBeforeWithdraw4 =
      await this.registryContract.lockedTicketsForSpecificInvestmentPerAddress(
        investmentId,
        this.lender4
      );

    const lockedTicketsBeforeWithdraw1 =
      await this.registryContract.lockedTicketsPerAddress(this.lender1);
    const lockedTicketsBeforeWithdraw2 =
      await this.registryContract.lockedTicketsPerAddress(this.lender2);
    const lockedTicketsBeforeWithdraw3 =
      await this.registryContract.lockedTicketsPerAddress(this.lender3);
    const lockedTicketsBeforeWithdraw4 =
      await this.registryContract.lockedTicketsPerAddress(this.lender4);

    const balanceFundingNFTTokenBeforeWithdraw1 =
      await this.fundingNFTContract.balanceOf(
        this.lender1,
        investmentId.toNumber()
      );
    const balanceFundingNFTTokenBeforeWithdraw2 =
      await this.fundingNFTContract.balanceOf(
        this.lender2,
        investmentId.toNumber()
      );
    const balanceFundingNFTTokenBeforeWithdraw3 =
      await this.fundingNFTContract.balanceOf(
        this.lender3,
        investmentId.toNumber()
      );
    const balanceFundingNFTTokenBeforeWithdraw4 =
      await this.fundingNFTContract.balanceOf(
        this.lender4,
        investmentId.toNumber()
      );

    const ticketsRemainBeforeWithdraw1 =
      await this.registryContract.remainingTicketsPerAddress(
        investmentId,
        this.lender1
      );
    const ticketsRemainBeforeWithdraw2 =
      await this.registryContract.remainingTicketsPerAddress(
        investmentId,
        this.lender2
      );
    const ticketsRemainBeforeWithdraw3 =
      await this.registryContract.remainingTicketsPerAddress(
        investmentId,
        this.lender3
      );
    const ticketsRemainBeforeWithdraw4 =
      await this.registryContract.remainingTicketsPerAddress(
        investmentId,
        this.lender4
      );

    const balanceLendingTokenBeforeWithdraw1 =
      await this.lendingTokenContract.balanceOf(this.lender1);
    const balanceLendingTokenBeforeWithdraw2 =
      await this.lendingTokenContract.balanceOf(this.lender2);
    const balanceLendingTokenBeforeWithdraw3 =
      await this.lendingTokenContract.balanceOf(this.lender3);
    const balanceLendingTokenBeforeWithdraw4 =
      await this.lendingTokenContract.balanceOf(this.lender4);
    const balanceLendingTokenBeforeWithdrawEscrow =
      await this.lendingTokenContract.balanceOf(this.escrowContract.address);

    let withdrawInvestmentTickets1,
      withdrawInvestmentTickets2,
      withdrawInvestmentTickets3,
      withdrawInvestmentTickets4;

    // When
    if (ticketsWonBeforeWithdraw1.gt(0)) {
      withdrawInvestmentTickets1 = await this.registryContract
        .connect(this.lender1Signer)
        .withdrawInvestmentTickets(
          investmentId,
          1,
          ticketsWonBeforeWithdraw1.sub(1)
        );
    }
    if (ticketsWonBeforeWithdraw2.gt(0)) {
      withdrawInvestmentTickets2 = await this.registryContract
        .connect(this.lender2Signer)
        .withdrawInvestmentTickets(
          investmentId,
          1,
          ticketsWonBeforeWithdraw2.sub(1)
        );
    }
    if (ticketsWonBeforeWithdraw3.gt(0)) {
      withdrawInvestmentTickets3 = await this.registryContract
        .connect(this.lender3Signer)
        .withdrawInvestmentTickets(
          investmentId,
          1,
          ticketsWonBeforeWithdraw3.sub(1)
        );
    }
    if (ticketsWonBeforeWithdraw4.gt(0)) {
      withdrawInvestmentTickets4 = await this.registryContract
        .connect(this.lender4Signer)
        .withdrawInvestmentTickets(
          investmentId,
          1,
          ticketsWonBeforeWithdraw4.sub(1)
        );
    }

    const ticketsWonAfterWithdraw1 =
      await this.registryContract.ticketsWonPerAddress(
        investmentId,
        this.lender1
      );
    const ticketsWonAfterWithdraw2 =
      await this.registryContract.ticketsWonPerAddress(
        investmentId,
        this.lender2
      );
    const ticketsWonAfterWithdraw3 =
      await this.registryContract.ticketsWonPerAddress(
        investmentId,
        this.lender3
      );
    const ticketsWonAfterWithdraw4 =
      await this.registryContract.ticketsWonPerAddress(
        investmentId,
        this.lender4
      );

    const lockedTicketsForSpecificInvestmentAfterWithdraw1 =
      await this.registryContract.lockedTicketsForSpecificInvestmentPerAddress(
        investmentId,
        this.lender1
      );
    const lockedTicketsForSpecificInvestmentAfterWithdraw2 =
      await this.registryContract.lockedTicketsForSpecificInvestmentPerAddress(
        investmentId,
        this.lender2
      );
    const lockedTicketsForSpecificInvestmentAfterWithdraw3 =
      await this.registryContract.lockedTicketsForSpecificInvestmentPerAddress(
        investmentId,
        this.lender3
      );
    const lockedTicketsForSpecificInvestmentAfterWithdraw4 =
      await this.registryContract.lockedTicketsForSpecificInvestmentPerAddress(
        investmentId,
        this.lender4
      );

    const lockedTicketsAfterWithdraw1 =
      await this.registryContract.lockedTicketsPerAddress(this.lender1);
    const lockedTicketsAfterWithdraw2 =
      await this.registryContract.lockedTicketsPerAddress(this.lender2);
    const lockedTicketsAfterWithdraw3 =
      await this.registryContract.lockedTicketsPerAddress(this.lender3);
    const lockedTicketsAfterWithdraw4 =
      await this.registryContract.lockedTicketsPerAddress(this.lender4);

    const balanceFundingNFTTokenAfterWithdraw1 =
      await this.fundingNFTContract.balanceOf(this.lender1, investmentId);
    const balanceFundingNFTTokenAfterWithdraw2 =
      await this.fundingNFTContract.balanceOf(this.lender2, investmentId);
    const balanceFundingNFTTokenAfterWithdraw3 =
      await this.fundingNFTContract.balanceOf(this.lender3, investmentId);
    const balanceFundingNFTTokenAfterWithdraw4 =
      await this.fundingNFTContract.balanceOf(this.lender4, investmentId);

    const ticketsRemainAfterWithdraw1 =
      await this.registryContract.remainingTicketsPerAddress(
        investmentId,
        this.lender1
      );
    const ticketsRemainAfterWithdraw2 =
      await this.registryContract.remainingTicketsPerAddress(
        investmentId,
        this.lender2
      );
    const ticketsRemainAfterWithdraw3 =
      await this.registryContract.remainingTicketsPerAddress(
        investmentId,
        this.lender3
      );
    const ticketsRemainAfterWithdraw4 =
      await this.registryContract.remainingTicketsPerAddress(
        investmentId,
        this.lender4
      );

    const balanceLendingTokenAfterWithdraw1 =
      await this.lendingTokenContract.balanceOf(this.lender1);
    const balanceLendingTokenAfterWithdraw2 =
      await this.lendingTokenContract.balanceOf(this.lender2);
    const balanceLendingTokenAfterWithdraw3 =
      await this.lendingTokenContract.balanceOf(this.lender3);
    const balanceLendingTokenAfterWithdraw4 =
      await this.lendingTokenContract.balanceOf(this.lender4);
    const balanceLendingTokenAfterWithdrawEscrow =
      await this.lendingTokenContract.balanceOf(this.escrowContract.address);

    // Then
    // Events
    // Withdraw Investment
    expect(withdrawInvestmentTickets1)
      .to.emit(this.registryContract, 'WithdrawInvestmentTickets')
      .withArgs(investmentId, 1, ticketsWonBeforeWithdraw1.sub(1));
    expect(withdrawInvestmentTickets2)
      .to.emit(this.registryContract, 'WithdrawInvestmentTickets')
      .withArgs(investmentId, 1, ticketsWonBeforeWithdraw2.sub(1));
    expect(withdrawInvestmentTickets3)
      .to.emit(this.registryContract, 'WithdrawInvestmentTickets')
      .withArgs(investmentId, 1, ticketsWonBeforeWithdraw3.sub(1));
    expect(withdrawInvestmentTickets4)
      .to.emit(this.registryContract, 'WithdrawInvestmentTickets')
      .withArgs(investmentId, 1, ticketsWonBeforeWithdraw4.sub(1));
    // WithdrawAmountForNonTickets
    if (ticketsRemainBeforeWithdraw1.gt(0)) {
      expect(withdrawInvestmentTickets1)
        .to.emit(this.registryContract, 'WithdrawAmountForNonTickets')
        .withArgs(
          investmentId,
          ethers.utils
            .parseEther(BASE_AMOUNT + '')
            .mul(ticketsRemainBeforeWithdraw1)
        );
    }
    if (ticketsRemainBeforeWithdraw2.gt(0)) {
      expect(withdrawInvestmentTickets2)
        .to.emit(this.registryContract, 'WithdrawAmountForNonTickets')
        .withArgs(
          investmentId,
          ethers.utils
            .parseEther(BASE_AMOUNT + '')
            .mul(ticketsRemainBeforeWithdraw2)
        );
    }
    if (ticketsRemainBeforeWithdraw3.gt(0)) {
      expect(withdrawInvestmentTickets3)
        .to.emit(this.registryContract, 'WithdrawAmountForNonTickets')
        .withArgs(
          investmentId,
          ethers.utils
            .parseEther(BASE_AMOUNT + '')
            .mul(ticketsRemainBeforeWithdraw3)
        );
    }
    if (ticketsRemainBeforeWithdraw4.gt(0)) {
      expect(withdrawInvestmentTickets4)
        .to.emit(this.registryContract, 'WithdrawAmountForNonTickets')
        .withArgs(
          investmentId,
          ethers.utils
            .parseEther(BASE_AMOUNT + '')
            .mul(ticketsRemainBeforeWithdraw4)
        );
    }

    // Correct amount of won tickets
    expect(ticketsWonAfterWithdraw1).to.be.equal(0);
    expect(ticketsWonAfterWithdraw2).to.be.equal(0);
    expect(ticketsWonAfterWithdraw3).to.be.equal(0);
    expect(ticketsWonAfterWithdraw4).to.be.equal(0);

    // Correct amount of tickets locked for specific investment
    expect(lockedTicketsForSpecificInvestmentAfterWithdraw1).to.be.equal(
      lockedTicketsForSpecificInvestmentBeforeWithdraw1.add(1)
    );
    expect(lockedTicketsForSpecificInvestmentAfterWithdraw2).to.be.equal(
      lockedTicketsForSpecificInvestmentBeforeWithdraw2.add(1)
    );
    expect(lockedTicketsForSpecificInvestmentAfterWithdraw3).to.be.equal(
      lockedTicketsForSpecificInvestmentBeforeWithdraw3.add(1)
    );
    expect(lockedTicketsForSpecificInvestmentAfterWithdraw4).to.be.equal(
      lockedTicketsForSpecificInvestmentBeforeWithdraw4.add(1)
    );
    // Correct amount of tickets locked
    expect(lockedTicketsAfterWithdraw1).to.be.equal(
      lockedTicketsBeforeWithdraw1.add(1)
    );
    expect(lockedTicketsAfterWithdraw2).to.be.equal(
      lockedTicketsBeforeWithdraw2.add(1)
    );
    expect(lockedTicketsAfterWithdraw3).to.be.equal(
      lockedTicketsBeforeWithdraw3.add(1)
    );
    expect(lockedTicketsAfterWithdraw4).to.be.equal(
      lockedTicketsBeforeWithdraw4.add(1)
    );
    // Correct balance of funding nft
    if (ticketsWonBeforeWithdraw1.gt(0)) {
      expect(balanceFundingNFTTokenAfterWithdraw1).to.be.equal(
        balanceFundingNFTTokenBeforeWithdraw1.add(
          ticketsWonBeforeWithdraw1.sub(1)
        )
      );
    }
    if (ticketsWonBeforeWithdraw2.gt(0)) {
      expect(balanceFundingNFTTokenAfterWithdraw2).to.be.equal(
        balanceFundingNFTTokenBeforeWithdraw2.add(
          ticketsWonBeforeWithdraw2.sub(1)
        )
      );
    }
    if (ticketsWonBeforeWithdraw3.gt(0)) {
      expect(balanceFundingNFTTokenAfterWithdraw3).to.be.equal(
        balanceFundingNFTTokenBeforeWithdraw3.add(
          ticketsWonBeforeWithdraw3.sub(1)
        )
      );
    }
    if (ticketsWonBeforeWithdraw4.gt(0)) {
      expect(balanceFundingNFTTokenAfterWithdraw4).to.be.equal(
        balanceFundingNFTTokenBeforeWithdraw4.add(
          ticketsWonBeforeWithdraw4.sub(1)
        )
      );
    }
    // Correct amount of tickets remaining
    expect(ticketsRemainAfterWithdraw1).to.be.equal(0);
    expect(ticketsRemainAfterWithdraw2).to.be.equal(0);
    expect(ticketsRemainAfterWithdraw3).to.be.equal(0);
    expect(ticketsRemainAfterWithdraw4).to.be.equal(0);
    // Correct balance of investment token
    expect(balanceLendingTokenAfterWithdraw1).to.be.equal(
      balanceLendingTokenBeforeWithdraw1.add(
        ethers.utils
          .parseEther(BASE_AMOUNT + '')
          .mul(ticketsRemainBeforeWithdraw1)
      )
    );
    expect(balanceLendingTokenAfterWithdraw2).to.be.equal(
      balanceLendingTokenBeforeWithdraw2.add(
        ethers.utils
          .parseEther(BASE_AMOUNT + '')
          .mul(ticketsRemainBeforeWithdraw2)
      )
    );
    expect(balanceLendingTokenAfterWithdraw3).to.be.equal(
      balanceLendingTokenBeforeWithdraw3.add(
        ethers.utils
          .parseEther(BASE_AMOUNT + '')
          .mul(ticketsRemainBeforeWithdraw3)
      )
    );
    expect(balanceLendingTokenAfterWithdraw4).to.be.equal(
      balanceLendingTokenBeforeWithdraw4.add(
        ethers.utils
          .parseEther(BASE_AMOUNT + '')
          .mul(ticketsRemainBeforeWithdraw4)
      )
    );
    expect(balanceLendingTokenAfterWithdrawEscrow).to.be.equal(
      balanceLendingTokenBeforeWithdrawEscrow.sub(
        ethers.utils
          .parseEther(BASE_AMOUNT + '')
          .mul(
            ticketsRemainBeforeWithdraw1
              .add(ticketsRemainBeforeWithdraw2)
              .add(ticketsRemainBeforeWithdraw3)
              .add(ticketsRemainBeforeWithdraw4)
          )
      )
    );

    //7) Funders with a FundingNFT exchange it for their Investment tokens.
    // Given
    const balanceFundingNFTTokenBeforeExchange1 =
      await this.fundingNFTContract.balanceOf(
        this.lender1,
        investmentId.toNumber()
      );
    const balanceFundingNFTTokenBeforeExchange2 =
      await this.fundingNFTContract.balanceOf(
        this.lender2,
        investmentId.toNumber()
      );
    const balanceFundingNFTTokenBeforeExchange3 =
      await this.fundingNFTContract.balanceOf(
        this.lender3,
        investmentId.toNumber()
      );
    const balanceFundingNFTTokenBeforeExchange4 =
      await this.fundingNFTContract.balanceOf(
        this.lender4,
        investmentId.toNumber()
      );

    const balanceOfInvestmentTokenBeforeExchange1 =
      await this.investmentTokenContract.balanceOf(this.lender1);
    const balanceOfInvestmentTokenBeforeExchange2 =
      await this.investmentTokenContract.balanceOf(this.lender2);
    const balanceOfInvestmentTokenBeforeExchange3 =
      await this.investmentTokenContract.balanceOf(this.lender3);
    const balanceOfInvestmentTokenBeforeExchange4 =
      await this.investmentTokenContract.balanceOf(this.lender4);

    const balanceOfInvestmentTokenBeforeExhangeEscrow =
      await this.investmentTokenContract.balanceOf(this.escrowContract.address);

    // When
    if (balanceFundingNFTTokenBeforeExchange1.toNumber() > 0) {
      await expect(
        this.registryContract
          .connect(this.lender1Signer)
          .convertNFTToInvestmentTokens(
            investmentId,
            balanceFundingNFTTokenBeforeExchange1
          )
      )
        .to.emit(this.registryContract, 'ConvertNFTToInvestmentTokens')
        .withArgs(
          investmentId,
          balanceFundingNFTTokenBeforeExchange1,
          investmentTokensPerTicket.mul(balanceFundingNFTTokenBeforeExchange1)
        );
    }
    if (balanceFundingNFTTokenBeforeExchange2.toNumber() > 0) {
      await expect(
        this.registryContract
          .connect(this.lender2Signer)
          .convertNFTToInvestmentTokens(
            investmentId,
            balanceFundingNFTTokenBeforeExchange2
          )
      )
        .to.emit(this.registryContract, 'ConvertNFTToInvestmentTokens')
        .withArgs(
          investmentId,
          balanceFundingNFTTokenBeforeExchange2,
          investmentTokensPerTicket.mul(balanceFundingNFTTokenBeforeExchange2)
        );
    }
    if (balanceFundingNFTTokenBeforeExchange3.toNumber() > 0) {
      await expect(
        this.registryContract
          .connect(this.lender3Signer)
          .convertNFTToInvestmentTokens(
            investmentId,
            balanceFundingNFTTokenBeforeExchange3
          )
      )
        .to.emit(this.registryContract, 'ConvertNFTToInvestmentTokens')
        .withArgs(
          investmentId,
          balanceFundingNFTTokenBeforeExchange3,
          investmentTokensPerTicket.mul(balanceFundingNFTTokenBeforeExchange3)
        );
    }
    if (balanceFundingNFTTokenBeforeExchange4.toNumber() > 0) {
      await expect(
        this.registryContract
          .connect(this.lender4Signer)
          .convertNFTToInvestmentTokens(
            investmentId,
            balanceFundingNFTTokenBeforeExchange4
          )
      )
        .to.emit(this.registryContract, 'ConvertNFTToInvestmentTokens')
        .withArgs(
          investmentId,
          balanceFundingNFTTokenBeforeExchange4,
          investmentTokensPerTicket.mul(balanceFundingNFTTokenBeforeExchange4)
        );
    }

    const balanceFundingNFTTokenAfterExchange1 =
      await this.fundingNFTContract.balanceOf(
        this.lender1,
        investmentId.toNumber()
      );
    const balanceFundingNFTTokenAfterExchange2 =
      await this.fundingNFTContract.balanceOf(
        this.lender2,
        investmentId.toNumber()
      );
    const balanceFundingNFTTokenAfterExchange3 =
      await this.fundingNFTContract.balanceOf(
        this.lender3,
        investmentId.toNumber()
      );
    const balanceFundingNFTTokenAfterExchange4 =
      await this.fundingNFTContract.balanceOf(
        this.lender4,
        investmentId.toNumber()
      );

    const balanceOfInvestmentTokenAfterExhange1 =
      await this.investmentTokenContract.balanceOf(this.lender1);
    const balanceOfInvestmentTokenAfterExhange2 =
      await this.investmentTokenContract.balanceOf(this.lender2);
    const balanceOfInvestmentTokenAfterExhange3 =
      await this.investmentTokenContract.balanceOf(this.lender3);
    const balanceOfInvestmentTokenAfterExhange4 =
      await this.investmentTokenContract.balanceOf(this.lender4);
    const balanceOfInvestmentTokenAfterExhangeEscrow =
      await this.investmentTokenContract.balanceOf(this.escrowContract.address);

    // Then
    // Correct balance of funding nft
    expect(balanceFundingNFTTokenAfterExchange1).to.be.equal(0);
    expect(balanceFundingNFTTokenAfterExchange2).to.be.equal(0);
    expect(balanceFundingNFTTokenAfterExchange3).to.be.equal(0);
    expect(balanceFundingNFTTokenAfterExchange4).to.be.equal(0);

    // Correct balance of investment token
    expect(balanceOfInvestmentTokenAfterExhange1).to.be.equal(
      balanceOfInvestmentTokenBeforeExchange1.add(
        investmentTokensPerTicket.mul(balanceFundingNFTTokenBeforeExchange1)
      )
    );
    expect(balanceOfInvestmentTokenAfterExhange2).to.be.equal(
      balanceOfInvestmentTokenBeforeExchange2.add(
        investmentTokensPerTicket.mul(balanceFundingNFTTokenBeforeExchange2)
      )
    );
    expect(balanceOfInvestmentTokenAfterExhange3).to.be.equal(
      balanceOfInvestmentTokenBeforeExchange3.add(
        investmentTokensPerTicket.mul(balanceFundingNFTTokenBeforeExchange3)
      )
    );
    expect(balanceOfInvestmentTokenAfterExhange4).to.be.equal(
      balanceOfInvestmentTokenBeforeExchange4.add(
        investmentTokensPerTicket.mul(balanceFundingNFTTokenBeforeExchange4)
      )
    );
    expect(balanceOfInvestmentTokenAfterExhangeEscrow).to.be.equal(
      balanceOfInvestmentTokenBeforeExhangeEscrow.sub(
        investmentTokensPerTicket.mul(
          balanceFundingNFTTokenBeforeExchange1
            .add(balanceFundingNFTTokenBeforeExchange2)
            .add(balanceFundingNFTTokenBeforeExchange3)
            .add(balanceFundingNFTTokenBeforeExchange4)
        )
      )
    );

    //8) Seeker claims the funding, when all investment tokens have been exchanged.
    // given
    const seekerInitialLendingBalance =
      await this.lendingTokenContract.balanceOf(this.seekerSigner.address);
    const expectedAmount = (
      await this.registryContract.investmentDetails(investmentId)
    ).totalAmountToBeRaised;

    // when
    await expect(
      this.registryContract
        .connect(this.seekerSigner)
        .withdrawInvestment(investmentId)
    )
      .to.emit(this.registryContract, 'seekerWithdrawInvestment')
      .withArgs(investmentId, expectedAmount);

    const seekerFinalLendingBalance = await this.lendingTokenContract.balanceOf(
      this.seekerSigner.address
    );
    const investmentWithdrawn = await this.registryContract.investmentWithdrawn(
      investmentId
    );
    const seekerGotLendingTokens = seekerFinalLendingBalance.eq(
      seekerInitialLendingBalance.add(expectedAmount)
    );
    //then
    expect(investmentWithdrawn).to.be.equal(true);
    expect(seekerGotLendingTokens).to.be.equal(true);
  });
}
