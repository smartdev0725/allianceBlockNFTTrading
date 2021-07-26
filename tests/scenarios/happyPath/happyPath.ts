import {BASE_AMOUNT} from '../../helpers/constants';
import {ethers, web3} from 'hardhat';
import {BigNumber} from 'ethers';
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
    const balanceFundingNftEscrowBefore =
      await this.fundingNFTContract.balanceOf(
        this.escrowContract.address,
        investmentId
      );
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
    const staker1StakingAmountBefore = await this.stakingContract.getBalance(
      this.lender1
    );
    const staker2StakingAmountBefore = await this.stakingContract.getBalance(
      this.lender2
    );
    const staker3StakingAmountBefore = await this.stakingContract.getBalance(
      this.lender3
    );

    const stakingTypeAmount1 = await this.stakingContract.stakingTypeAmounts(
      StakingType.STAKER_LVL_1
    );
    const stakingTypeAmount2 = await this.stakingContract.stakingTypeAmounts(
      StakingType.STAKER_LVL_2
    );
    const stakingTypeAmount3 = await this.stakingContract.stakingTypeAmounts(
      StakingType.STAKER_LVL_3
    );

    expect(stakingTypeAmount2.gt(stakingTypeAmount1)).to.be.equal(true);
    expect(stakingTypeAmount3.gt(stakingTypeAmount2)).to.be.equal(true);

    const amountToStake1 = stakingTypeAmount1.sub(staker1StakingAmountBefore);
    const amountToStake2 = stakingTypeAmount2.sub(staker2StakingAmountBefore);
    const amountToStake3 = stakingTypeAmount3.sub(staker3StakingAmountBefore);

    const staker1ALBTBalanceBefore = await this.ALBTContract.balanceOf(
      this.lender1
    );
    const staker2ALBTBalanceBefore = await this.ALBTContract.balanceOf(
      this.lender2
    );
    const staker3ALBTBalanceBefore = await this.ALBTContract.balanceOf(
      this.lender3
    );

    const stakingContractALBTBalanceBefore = await this.ALBTContract.balanceOf(
      this.stakingContract.address
    );
    const stakedSupplyBefore = await this.stakingContract.totalSupply();
    const rALBTBalanceBefore1 = await this.rALBTContract.balanceOf(
      this.lender1
    );
    const rALBTBalanceBefore2 = await this.rALBTContract.balanceOf(
      this.lender2
    );
    const rALBTBalanceBefore3 = await this.rALBTContract.balanceOf(
      this.lender3
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

    const staker1StakingAmounAfter = await this.stakingContract.getBalance(
      this.lender1
    );
    const staker2StakingAmounAfter = await this.stakingContract.getBalance(
      this.lender2
    );
    const staker3StakingAmounAfter = await this.stakingContract.getBalance(
      this.lender3
    );
    const stakedSupplyAfter = await this.stakingContract.totalSupply();
    const staker1ALBTBalanceAfter = await this.ALBTContract.balanceOf(
      this.lender1
    );
    const staker2ALBTBalanceAfter = await this.ALBTContract.balanceOf(
      this.lender2
    );
    const staker3ALBTBalanceAfter = await this.ALBTContract.balanceOf(
      this.lender3
    );
    const stakingContractALBTBalanceAfter = await this.ALBTContract.balanceOf(
      this.stakingContract.address
    );
    const rALBTBalanceAfter1 = await this.rALBTContract.balanceOf(this.lender1);
    const rALBTBalanceAfter2 = await this.rALBTContract.balanceOf(this.lender2);
    const rALBTBalanceAfter3 = await this.rALBTContract.balanceOf(this.lender3);

    const levelOfStakerAfter1 =
      await this.stakerMedalNFTContract.getLevelOfStaker(this.lender1);
    const levelOfStakerAfter2 =
      await this.stakerMedalNFTContract.getLevelOfStaker(this.lender2);
    const levelOfStakerAfter3 =
      await this.stakerMedalNFTContract.getLevelOfStaker(this.lender3);

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

    // Then
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

    expect(staker1StakingAmounAfter.gt(staker1StakingAmountBefore)).to.be.equal(
      true
    );
    expect(staker2StakingAmounAfter.gt(staker2StakingAmountBefore)).to.be.equal(
      true
    );
    expect(staker3StakingAmounAfter.gt(staker3StakingAmountBefore)).to.be.equal(
      true
    );

    expect(staker1ALBTBalanceAfter).to.be.equal(
      staker1ALBTBalanceBefore.sub(amountToStake1)
    );
    expect(staker2ALBTBalanceAfter).to.be.equal(
      staker2ALBTBalanceBefore.sub(amountToStake2)
    );
    expect(staker3ALBTBalanceAfter).to.be.equal(
      staker3ALBTBalanceBefore.sub(amountToStake3)
    );

    expect(stakingContractALBTBalanceAfter).to.be.equal(
      stakingContractALBTBalanceBefore
        .add(amountToStake1)
        .add(amountToStake2)
        .add(amountToStake3)
    );

    expect(stakedSupplyAfter).to.be.equal(
      stakedSupplyBefore
        .add(amountToStake1)
        .add(amountToStake2)
        .add(amountToStake3)
    );
    expect(rALBTBalanceAfter1.gt(rALBTBalanceBefore1)).to.be.equal(true);
    expect(rALBTBalanceAfter2.gt(rALBTBalanceBefore2)).to.be.equal(true);
    expect(rALBTBalanceAfter3.gt(rALBTBalanceBefore3)).to.be.equal(true);

    //Simulates lender4 has rALBT from other methods besides staking
    //GET rALBT HERE!!
    // Given
    const rALBTBalanceBefore4 = await this.rALBTContract.balanceOf(
      this.lender4
    );

    const addressZero = '0x0000000000000000000000000000000000000000';
    const actions = [
      {
        account: this.lender4,
        actionName: 'Wallet Connect',
        answer: 'Yes',
        referralId: '0',
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

    await this.actionVerifierContract
      .connect(this.deployerSigner)
      .importAction(
        'Wallet Connect',
        reputationalAlbtRewardsPerLevel,
        reputationalAlbtRewardsPerLevelAfterFirstTime,
        2,
        addressZero
      );

    const signature = await getSignature(
      'Wallet Connect',
      'Yes',
      this.lender4,
      0,
      this.actionVerifierContract.address,
      web3
    );

    const signatures = [signature];

    // Then
    await this.actionVerifierContract
      .connect(this.lender3Signer)
      .provideRewardsForActions(actions, signatures);

    for (let i = 0; i < 50; i++) {
      await increaseTime(this.deployerSigner.provider, 1 * 24 * 60 * 60); // 1 day

      await this.actionVerifierContract
        .connect(this.lender3Signer)
        .provideRewardsForActions(actions, signatures);
    }

    const rALBTBalanceAfter4 = await this.rALBTContract.balanceOf(this.lender4);

    // Then
    expect(Number(rALBTBalanceAfter4)).to.be.greaterThan(
      Number(rALBTBalanceBefore4)
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

    await this.registryContract
      .connect(this.lender2Signer)
      .showInterestForInvestment(investmentId, numberOfPartitions);

    await this.registryContract
      .connect(this.lender3Signer)
      .showInterestForInvestment(investmentId, numberOfPartitions);

    await this.registryContract
      .connect(this.lender4Signer)
      .showInterestForInvestment(investmentId, numberOfPartitions);

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
    // Given
    await this.governanceContract
      .connect(this.superDelegatorSigner)
      .checkCronjobs();
    await this.governanceContract
      .connect(this.superDelegatorSigner)
      .checkCronjobs();

    const investmentStatusAfter = await this.registryContract.investmentStatus(
      investmentId
    );

    expect(investmentStatusAfter).to.be.equal(2);

    // When
    await expect(
      this.registryContract
        .connect(this.lender2Signer)
        .executeLotteryRun(investmentId)
    )
      .to.emit(this.registryContract, 'LotteryExecuted')
      .withArgs(investmentId);

    const ticketsRemainingAfter = await this.registryContract.ticketsRemaining(
      investmentId
    );

    // Then
    expect(ticketsRemainingAfter.toNumber()).to.be.equal(0);

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
        .to.emit(this.registryContract, 'WithdrawInvestment')
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
        .to.emit(this.registryContract, 'WithdrawInvestment')
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
        .to.emit(this.registryContract, 'WithdrawInvestment')
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
        .to.emit(this.registryContract, 'WithdrawInvestment')
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
  });
}
