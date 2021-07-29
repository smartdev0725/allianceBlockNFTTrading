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
  // Given
  const {registryContract} = await getContracts();

  const numberInvestmentBefore = await registryContract.totalInvestments();

  // When
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

  // Then
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

  const status = await registryContract.investmentStatus(investmentId);
  expect(String(status)).to.be.equal(String(InvestmentStatus.REQUESTED));

  // When
  await governanceContract
    .connect(superDelegatorSigner)
    .superVoteForRequest(investmentId, approve);

  const status2 = await registryContract.investmentStatus(investmentId);

  // Then
  if (approve) {
    expect(String(status2)).to.be.equal(String(InvestmentStatus.APPROVED));
  } else {
    expect(String(status2)).to.be.equal(String(InvestmentStatus.REJECTED));
  }
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

export const batchFundersStake = async (data: Stake[]) => {
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
  // Given
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

  // When
  await actionVerifierContract
    .connect(actionCallerSigner)
    .provideRewardsForActions(actions, signatures);

  const rALBTBalanceAfter = await rALBTContract.balanceOf(lenderSigner.address);

  // Then
  if (rALBTBalanceAfter.eq(rALBTBalanceBefore)) {
    console.log("Didn't get rALBT");
  } else {
    expect(Number(rALBTBalanceAfter)).to.be.greaterThan(
      Number(rALBTBalanceBefore)
    );
  }
};
export const batchGetRALBTWithActions = async (
  data: GetRALBTData[],
  deployerSigner: Signer
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
  const lotteryNumbersForImmediateTicket =
    await registryContract.lotteryNumbersForImmediateTicket();
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
    let totalLotteryNumbersForLender = (
      await rALBTContract.balanceOf(lenderSigner.address)
    ).div(rAlbtPerLotteryNumber);
    let immediateTicketsLender = BigNumber.from(0);
    let ticketsRemaining = await registryContract.ticketsRemaining(
      investmentId
    );
    const totalLotteryNumbersPerInvestment =
      await registryContract.totalLotteryNumbersPerInvestment(investmentId);

    // When
    await registryContract
      .connect(lenderSigner)
      .showInterestForInvestment(investmentId, numberOfPartitions);

    //removed this test until i find a way to make it work for variable input
    // expect(
    //   (await registryContract.investmentDetails(investmentId))
    //     .partitionsRequested
    // ).to.be.equal(numberOfPartitions.mul(iteration));
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
              lenderSigner.address
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
          lenderSigner.address
        )
      ).eq(numberOfPartitions.sub(immediateTicketsLender))
    ).to.be.true;
    expect(
      (
        await registryContract.totalLotteryNumbersPerInvestment(investmentId)
      ).eq(totalLotteryNumbersPerInvestment.add(totalLotteryNumbersForLender))
    ).to.be.true;
    // totalLotteryNumbersPerInvestment = totalLotteryNumbersPerInvestment.add(
    //   totalLotteryNumbersForLender
    // );

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
