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

    let signature = await getSignature(
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

    await this.registryContract
      .connect(this.lender2Signer)
      .showInterestForInvestment(investmentId, numberOfPartitions);
    expect(
      (await this.registryContract.investmentDetails(investmentId))
        .partitionsRequested
    ).to.be.equal(numberOfPartitions.mul(2));

    await this.registryContract
      .connect(this.lender3Signer)
      .showInterestForInvestment(investmentId, numberOfPartitions);
    expect(
      (await this.registryContract.investmentDetails(investmentId))
        .partitionsRequested
    ).to.be.equal(numberOfPartitions.mul(3));

    await this.registryContract
      .connect(this.lender4Signer)
      .showInterestForInvestment(investmentId, numberOfPartitions);
    expect(
      (await this.registryContract.investmentDetails(investmentId))
        .partitionsRequested
    ).to.be.equal(numberOfPartitions.mul(4));

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
    const ticketsWonBefore1 = await this.registryContract.ticketsWonPerAddress(
      investmentId,
      this.lender1
    );
    const ticketsRemainBefore1 =
      await this.registryContract.remainingTicketsPerAddress(
        investmentId,
        this.lender1
      );

    const ticketsWonBefore2 = await this.registryContract.ticketsWonPerAddress(
      investmentId,
      this.lender2
    );
    const ticketsRemainBefore2 =
      await this.registryContract.remainingTicketsPerAddress(
        investmentId,
        this.lender2
      );

    const ticketsWonBefore3 = await this.registryContract.ticketsWonPerAddress(
      investmentId,
      this.lender3
    );
    const ticketsRemainBefore3 =
      await this.registryContract.remainingTicketsPerAddress(
        investmentId,
        this.lender3
      );

    const ticketsWonBefore4 = await this.registryContract.ticketsWonPerAddress(
      investmentId,
      this.lender4
    );
    const ticketsRemainBefore4 =
      await this.registryContract.remainingTicketsPerAddress(
        investmentId,
        this.lender4
      );

    const balanceFundingNFTTokenBefore1 =
      await this.fundingNFTContract.balanceOf(
        this.lender1,
        investmentId.toNumber()
      );
    const balanceFundingNFTTokenBefore2 =
      await this.fundingNFTContract.balanceOf(
        this.lender2,
        investmentId.toNumber()
      );
    const balanceFundingNFTTokenBefore3 =
      await this.fundingNFTContract.balanceOf(
        this.lender3,
        investmentId.toNumber()
      );
    const balanceFundingNFTTokenBefore4 =
      await this.fundingNFTContract.balanceOf(
        this.lender4,
        investmentId.toNumber()
      );

    const lenderLendingTokenBalanceBeforeWithdraw1 =
      await this.lendingTokenContract.balanceOf(this.lender1);
    const lenderLendingTokenBalanceBeforeWithdraw2 =
      await this.lendingTokenContract.balanceOf(this.lender2);
    const lenderLendingTokenBalanceBeforeWithdraw3 =
      await this.lendingTokenContract.balanceOf(this.lender3);
    const lenderLendingTokenBalanceBeforeWithdraw4 =
      await this.lendingTokenContract.balanceOf(this.lender4);

    // When
    if (Number(ticketsWonBefore1) > 0) {
      await expect(
        this.registryContract
          .connect(this.lender1Signer)
          .withdrawInvestmentTickets(
            investmentId,
            1,
            Number(ticketsWonBefore1) - 1
          )
      )
        .to.emit(this.registryContract, 'WithdrawInvestmentTickets')
        .withArgs(investmentId, 1, Number(ticketsWonBefore1) - 1);

      await expectRevert(
        this.registryContract
          .connect(this.lender1Signer)
          .withdrawAmountProvidedForNonWonTickets(investmentId),
        'No non-won tickets to withdraw'
      );
    }

    if (Number(ticketsWonBefore2) > 0) {
      await expect(
        this.registryContract
          .connect(this.lender2Signer)
          .withdrawInvestmentTickets(
            investmentId,
            1,
            Number(ticketsWonBefore2) - 1
          )
      )
        .to.emit(this.registryContract, 'WithdrawInvestmentTickets')
        .withArgs(investmentId, 1, Number(ticketsWonBefore2) - 1);

      await expectRevert(
        this.registryContract
          .connect(this.lender2Signer)
          .withdrawAmountProvidedForNonWonTickets(investmentId),
        'No non-won tickets to withdraw'
      );
    }

    if (Number(ticketsWonBefore3) > 0) {
      await expect(
        this.registryContract
          .connect(this.lender3Signer)
          .withdrawInvestmentTickets(
            investmentId,
            1,
            Number(ticketsWonBefore3) - 1
          )
      )
        .to.emit(this.registryContract, 'WithdrawInvestmentTickets')
        .withArgs(investmentId, 1, Number(ticketsWonBefore3) - 1);

      await expectRevert(
        this.registryContract
          .connect(this.lender3Signer)
          .withdrawAmountProvidedForNonWonTickets(investmentId),
        'No non-won tickets to withdraw'
      );
    }

    if (Number(ticketsWonBefore4) > 0) {
      await expect(
        this.registryContract
          .connect(this.lender4Signer)
          .withdrawInvestmentTickets(
            investmentId,
            1,
            Number(ticketsWonBefore4) - 1
          )
      )
        .to.emit(this.registryContract, 'WithdrawInvestmentTickets')
        .withArgs(investmentId, 1, Number(ticketsWonBefore4) - 1);

      await expectRevert(
        this.registryContract
          .connect(this.lender4Signer)
          .withdrawAmountProvidedForNonWonTickets(investmentId),
        'No non-won tickets to withdraw'
      );
    }

    const ticketsAfter1 = await this.registryContract.ticketsWonPerAddress(
      investmentId,
      this.lender1
    );
    const ticketsAfter2 = await this.registryContract.ticketsWonPerAddress(
      investmentId,
      this.lender2
    );
    const ticketsAfter3 = await this.registryContract.ticketsWonPerAddress(
      investmentId,
      this.lender3
    );
    const ticketsAfter4 = await this.registryContract.ticketsWonPerAddress(
      investmentId,
      this.lender4
    );

    const balanceFundingNFTTokenAfter1 =
      await this.fundingNFTContract.balanceOf(
        this.lender1,
        investmentId.toNumber()
      );
    const balanceFundingNFTTokenAfter2 =
      await this.fundingNFTContract.balanceOf(
        this.lender2,
        investmentId.toNumber()
      );
    const balanceFundingNFTTokenAfter3 =
      await this.fundingNFTContract.balanceOf(
        this.lender3,
        investmentId.toNumber()
      );
    const balanceFundingNFTTokenAfter4 =
      await this.fundingNFTContract.balanceOf(
        this.lender4,
        investmentId.toNumber()
      );

    const lenderLendingTokenBalanceAfterWithdraw1 =
      await this.lendingTokenContract.balanceOf(this.lender1);
    const lenderLendingTokenBalanceAfterWithdraw2 =
      await this.lendingTokenContract.balanceOf(this.lender2);
    const lenderLendingTokenBalanceAfterWithdraw3 =
      await this.lendingTokenContract.balanceOf(this.lender3);
    const lenderLendingTokenBalanceAfterWithdraw4 =
      await this.lendingTokenContract.balanceOf(this.lender4);

    // Then
    expect(ticketsAfter1.toNumber()).to.be.equal(0);
    expect(ticketsAfter2.toNumber()).to.be.equal(0);
    expect(ticketsAfter3.toNumber()).to.be.equal(0);
    expect(ticketsAfter4.toNumber()).to.be.equal(0);

    if (Number(ticketsWonBefore1) > 0) {
      expect(balanceFundingNFTTokenAfter1).to.be.gt(
        balanceFundingNFTTokenBefore1
      );
    }

    if (Number(ticketsWonBefore2) > 0) {
      expect(balanceFundingNFTTokenAfter2).to.be.gt(
        balanceFundingNFTTokenBefore2
      );
    }

    if (Number(ticketsWonBefore3) > 0) {
      expect(balanceFundingNFTTokenAfter3).to.be.gt(
        balanceFundingNFTTokenBefore3
      );
    }

    if (Number(ticketsWonBefore4) > 0) {
      expect(balanceFundingNFTTokenAfter4).to.be.gt(
        balanceFundingNFTTokenBefore4
      );
    }

    expect(lenderLendingTokenBalanceAfterWithdraw1).to.be.equal(
      lenderLendingTokenBalanceBeforeWithdraw1.add(
        ethers.utils.parseEther(BASE_AMOUNT + '').mul(ticketsRemainBefore1)
      )
    );
    expect(lenderLendingTokenBalanceAfterWithdraw2).to.be.equal(
      lenderLendingTokenBalanceBeforeWithdraw2.add(
        ethers.utils.parseEther(BASE_AMOUNT + '').mul(ticketsRemainBefore2)
      )
    );
    expect(lenderLendingTokenBalanceAfterWithdraw3).to.be.equal(
      lenderLendingTokenBalanceBeforeWithdraw3.add(
        ethers.utils.parseEther(BASE_AMOUNT + '').mul(ticketsRemainBefore3)
      )
    );
    expect(lenderLendingTokenBalanceAfterWithdraw4).to.be.equal(
      lenderLendingTokenBalanceBeforeWithdraw4.add(
        ethers.utils.parseEther(BASE_AMOUNT + '').mul(ticketsRemainBefore4)
      )
    );

    //validar rALBT balance e los usuarios cambie (no necesariamente)

    //7) Funders with a FundingNFT exchange it for their Investment tokens.
    // Given
    const balanceOfInvestmentTokenBefore1 =
      await this.investmentTokenContract.balanceOf(this.lender1);
    const balanceOfInvestmentTokenBefore2 =
      await this.investmentTokenContract.balanceOf(this.lender2);
    const balanceOfInvestmentTokenBefore3 =
      await this.investmentTokenContract.balanceOf(this.lender3);
    const balanceOfInvestmentTokenBefore4 =
      await this.investmentTokenContract.balanceOf(this.lender4);

    // When
    if (balanceFundingNFTTokenAfter1.toNumber() > 0) {
      await expect(
        this.registryContract
          .connect(this.lender1Signer)
          .convertNFTToInvestmentTokens(
            investmentId,
            balanceFundingNFTTokenAfter1
          )
      )
        .to.emit(this.registryContract, 'ConvertNFTToInvestmentTokens')
        .withArgs(
          investmentId,
          balanceFundingNFTTokenAfter1,
          investmentTokensPerTicket.mul(balanceFundingNFTTokenAfter1)
        );
    }
    if (balanceFundingNFTTokenAfter2.toNumber() > 0) {
      await expect(
        this.registryContract
          .connect(this.lender2Signer)
          .convertNFTToInvestmentTokens(
            investmentId,
            balanceFundingNFTTokenAfter2
          )
      )
        .to.emit(this.registryContract, 'ConvertNFTToInvestmentTokens')
        .withArgs(
          investmentId,
          balanceFundingNFTTokenAfter2,
          investmentTokensPerTicket.mul(balanceFundingNFTTokenAfter2)
        );
    }
    if (balanceFundingNFTTokenAfter3.toNumber() > 0) {
      await expect(
        this.registryContract
          .connect(this.lender3Signer)
          .convertNFTToInvestmentTokens(
            investmentId,
            balanceFundingNFTTokenAfter3
          )
      )
        .to.emit(this.registryContract, 'ConvertNFTToInvestmentTokens')
        .withArgs(
          investmentId,
          balanceFundingNFTTokenAfter3,
          investmentTokensPerTicket.mul(balanceFundingNFTTokenAfter3)
        );
    }
    if (balanceFundingNFTTokenAfter4.toNumber() > 0) {
      await expect(
        this.registryContract
          .connect(this.lender4Signer)
          .convertNFTToInvestmentTokens(
            investmentId,
            balanceFundingNFTTokenAfter4
          )
      )
        .to.emit(this.registryContract, 'ConvertNFTToInvestmentTokens')
        .withArgs(
          investmentId,
          balanceFundingNFTTokenAfter4,
          investmentTokensPerTicket.mul(balanceFundingNFTTokenAfter4)
        );
    }

    const balanceOfInvestmentTokenAfter1 =
      await this.investmentTokenContract.balanceOf(this.lender1);
    const balanceOfInvestmentTokenAfter2 =
      await this.investmentTokenContract.balanceOf(this.lender2);
    const balanceOfInvestmentTokenAfter3 =
      await this.investmentTokenContract.balanceOf(this.lender3);
    const balanceOfInvestmentTokenAfter4 =
      await this.investmentTokenContract.balanceOf(this.lender4);

    // Then
    expect(
      await this.fundingNFTContract.balanceOf(
        this.lender1,
        investmentId.toNumber()
      )
    ).to.be.equal(0);
    expect(
      await this.fundingNFTContract.balanceOf(
        this.lender2,
        investmentId.toNumber()
      )
    ).to.be.equal(0);
    expect(
      await this.fundingNFTContract.balanceOf(
        this.lender3,
        investmentId.toNumber()
      )
    ).to.be.equal(0);
    expect(
      await this.fundingNFTContract.balanceOf(
        this.lender4,
        investmentId.toNumber()
      )
    ).to.be.equal(0);

    expect(balanceOfInvestmentTokenAfter1.toString()).to.be.equal(
      balanceOfInvestmentTokenBefore1.add(
        ethers.utils
          .parseEther('50')
          .mul(balanceFundingNFTTokenAfter1)
          .toString()
      )
    );
    expect(balanceOfInvestmentTokenAfter2.toString()).to.be.equal(
      balanceOfInvestmentTokenBefore2.add(
        ethers.utils
          .parseEther('50')
          .mul(balanceFundingNFTTokenAfter2)
          .toString()
      )
    );
    expect(balanceOfInvestmentTokenAfter3.toString()).to.be.equal(
      balanceOfInvestmentTokenBefore3.add(
        ethers.utils
          .parseEther('50')
          .mul(balanceFundingNFTTokenAfter3)
          .toString()
      )
    );
    expect(balanceOfInvestmentTokenAfter4.toString()).to.be.equal(
      balanceOfInvestmentTokenBefore4.add(
        ethers.utils
          .parseEther('50')
          .mul(balanceFundingNFTTokenAfter4)
          .toString()
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
    
    const seekerFinalLendingBalance =
      await this.lendingTokenContract.balanceOf(this.seekerSigner.address);
    const investmentWithdrawn =
      await this.registryContract.investmentWithdrawn(investmentId);
    const seekerGotLendingTokens = seekerFinalLendingBalance.eq(
      seekerInitialLendingBalance.add(expectedAmount)
    );
    //then
    expect(investmentWithdrawn).to.be.equal(true);
    expect(seekerGotLendingTokens).to.be.equal(true);
  });
}
