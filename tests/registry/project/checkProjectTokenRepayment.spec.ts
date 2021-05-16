import BN from 'bn.js';
import {expect} from 'chai';
import {ONE_DAY, BASE_AMOUNT} from '../../helpers/constants';
import {getCurrentTimestamp, increaseTime} from '../../helpers/time';
import {deployments, ethers, getNamedAccounts} from 'hardhat';
import {
  getContracts,
  getSigners,
  initializeTransfers,
} from '../../helpers/utils';
const {expectEvent} = require('@openzeppelin/test-helpers');
import {BigNumber} from 'ethers';

describe('Project token repayment', async () => {
  let loanId: BigNumber;
  let approvalRequest: BigNumber;
  let bigPartition: BigNumber;
  let totalPartitions: BigNumber;
  let totalAmountRequested: BigNumber;
  const totalMilestones = BigNumber.from(3);
  const interestPercentage = BigNumber.from(20);
  const amountRequestedPerMilestone = new Array<BigNumber>(totalMilestones);
  const milestoneDurations = new Array<BigNumber>(totalMilestones);
  let registryContract: any;
  let governanceContract: any;
  let fundingNFTContract: any;
  let escrowContract: any;
  let lendingTokenContract: any;
  let projectTokenContract: any;
  let collateralTokenContract: any;

  beforeEach(async function () {
    // Deploy fixtures
    await deployments.fixture();

    // Get accounts
    const {deployer, seeker, lender1, lender2} = await getNamedAccounts();
    const {
      deployerSigner,
      lender1Signer,
      lender2Signer,
      seekerSigner,
      delegator1Signer,
      delegator2Signer,
    } = await getSigners();

    // Get contracts
    ({
      registryContract,
      governanceContract,
      fundingNFTContract,
      escrowContract,
      lendingTokenContract,
      projectTokenContract,
      collateralTokenContract,
    } = await getContracts());

    // Initialize Transfers
    await initializeTransfers(
      {
        registryContract,
        lendingTokenContract,
        projectTokenContract,
        collateralTokenContract,
      },
      {lender1, lender2, seeker, deployer},
      {deployerSigner, lender1Signer, lender2Signer, seekerSigner}
    );

    loanId = await registryContract.totalLoans();
    approvalRequest = await governanceContract.totalApprovalRequests();

    const amountCollateralized = ethers.utils.parseEther('100000');
    const projectTokenPrice = BigNumber.from(1);
    const discountPerMillion = BigNumber.from(400000);
    const paymentTimeInterval = BigNumber.from(20 * ONE_DAY);
    const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

    const currentTime = await getCurrentTimestamp();

    for (let i = 0; i < Number(totalMilestones); i++) {
      milestoneDurations[i] = BigNumber.from(
        currentTime.add(new BN((i + 1) * ONE_DAY)).toString()
      );
      amountRequestedPerMilestone[i] = ethers.utils.parseEther('10000');
    }

    await registryContract
      .connect(deployerSigner)
      .requestProjectLoan(
        amountRequestedPerMilestone,
        projectTokenContract.address,
        amountCollateralized.toString(),
        projectTokenPrice,
        interestPercentage,
        discountPerMillion,
        totalMilestones,
        milestoneDurations,
        paymentTimeInterval,
        ipfsHash
      );

    totalAmountRequested = amountRequestedPerMilestone[0].mul(totalMilestones);
    totalPartitions = totalAmountRequested.div(
      ethers.utils.parseEther(BASE_AMOUNT + '')
    );
    bigPartition = totalPartitions.div(BigNumber.from(2));

    await governanceContract
      .connect(delegator1Signer)
      .voteForRequest(approvalRequest, true);
    await governanceContract
      .connect(delegator2Signer)
      .voteForRequest(approvalRequest, true);

    await registryContract
      .connect(lender1Signer)
      .fundLoan(loanId, bigPartition);
    await registryContract
      .connect(lender2Signer)
      .fundLoan(loanId, bigPartition);
  });

  it('when project tokens can not be claimed if no milestones are delivered yet', async function () {
    const {lender1, lender2} = await getNamedAccounts();

    const convertibleAmountLender0 =
      await registryContract.getAvailableFundingNFTForConversion(
        loanId,
        lender1
      );
    const convertibleAmountLender1 =
      await registryContract.getAvailableFundingNFTForConversion(
        loanId,
        lender2
      );

    expect(convertibleAmountLender0.toNumber()).to.be.equal(0);
    expect(convertibleAmountLender1.toNumber()).to.be.equal(0);
  });

  it('when a percent of NFT can be converted after delivering the first milestone', async function () {
    const {lender1} = await getNamedAccounts();
    const {deployerSigner, lender1Signer, delegator1Signer, delegator2Signer} =
      await getSigners();

    approvalRequest = await governanceContract.totalApprovalRequests();
    await registryContract.connect(deployerSigner).applyMilestone(loanId);
    await governanceContract
      .connect(delegator1Signer)
      .voteForRequest(approvalRequest, true);
    await governanceContract
      .connect(delegator2Signer)
      .voteForRequest(approvalRequest, true);

    const convertibleAmountLender0 =
      await registryContract.getAvailableFundingNFTForConversion(
        loanId,
        lender1
      );
    const expectedAmount = bigPartition
      .mul(amountRequestedPerMilestone[0])
      .div(totalAmountRequested);

    expect(convertibleAmountLender0.toString()).to.be.equal(
      expectedAmount.toString()
    );

    const balanceLenderBefore = await projectTokenContract.balanceOf(lender1);
    const balanceEscrowBefore = await projectTokenContract.balanceOf(
      escrowContract.address
    );
    const balanceNFTLenderBefore =
      await registryContract.balanceOfAllFundingNFTGenerations(loanId, lender1);

    // Test getter first
    const getterProjectTokenAmount = await registryContract
      .connect(lender1Signer)
      .getAmountOfProjectTokensToReceive(loanId, convertibleAmountLender0);
    // Request to receive project tokens as repayment for all of the convertible NFT
    const tx1 = await registryContract
      .connect(lender1Signer)
      .receivePayment(loanId, convertibleAmountLender0, true);

    const balanceNFTLenderAfter =
      await registryContract.balanceOfAllFundingNFTGenerations(loanId, lender1);
    const balanceLenderAfter = await projectTokenContract.balanceOf(lender1);
    const balanceEscrowAfter = await projectTokenContract.balanceOf(
      escrowContract.address
    );
    const loanPayments = await registryContract.projectLoanPayments(loanId);
    const expectedAmountToReceive = convertibleAmountLender0.mul(
      ethers.utils.parseEther(BASE_AMOUNT + '')
    );
    const tokenPrice = await registryContract.getProjectTokenPrice(loanId);
    const discountedPrice = tokenPrice.sub(
      tokenPrice
        .mul(loanPayments.discountPerMillion)
        .div(BigNumber.from(1000000))
    );
    const expectedProjectTokenAmount =
      expectedAmountToReceive.div(discountedPrice);
    const remainingLendingAmountToPayBack = totalAmountRequested.sub(
      expectedAmountToReceive
    );
    const amountToBeRepaid = remainingLendingAmountToPayBack.add(
      remainingLendingAmountToPayBack
        .mul(interestPercentage)
        .div(BigNumber.from(100))
    );

    // Correct balances
    expect(getterProjectTokenAmount.toString()).to.be.equal(
      expectedProjectTokenAmount.toString()
    );
    expect(
      balanceNFTLenderBefore.sub(convertibleAmountLender0).toString()
    ).to.be.equal(balanceNFTLenderAfter.toString());
    expect(
      balanceLenderBefore.add(expectedProjectTokenAmount).toString()
    ).to.be.equal(balanceLenderAfter.toString());
    expect(
      balanceEscrowBefore.sub(expectedProjectTokenAmount).toString()
    ).to.be.equal(balanceEscrowAfter.toString());
    // TODO: check balances of token from generation 1

    // Correct partitions paid in project tokens tracked and updated amount to settle the loan
    expect(loanPayments.partitionsPaidInProjectTokens.toString()).to.be.equal(
      convertibleAmountLender0.toString()
    );
    const amountToBeRepaidLoanId = await registryContract.getAmountToBeRepaid(
      loanId
    );
    expect(amountToBeRepaidLoanId.toString()).to.be.equal(
      amountToBeRepaid.toString()
    );

    // Correct Event.
    expectEvent(tx1.receipt, 'PaymentReceived', {
      loanId,
      amountOfTokens: convertibleAmountLender0,
      generation: BigNumber.from(0),
      onProjectTokens: true,
      user: lender1,
    });
    expectEvent(tx1.receipt, 'ProjectTokenPaymentReceived', {
      loanId,
      user: lender1,
      amountOfProjectTokens: expectedProjectTokenAmount,
      discountedPrice,
    });
  });

  it('when more NFT can be converted after delivering the second milestone', async function () {
    const {lender1} = await getNamedAccounts();

    const {deployerSigner, lender1Signer, delegator1Signer, delegator2Signer} =
      await getSigners();

    const milestonesToDeliver = 2;
    for (let i = 0; i < milestonesToDeliver; i++) {
      approvalRequest = await governanceContract.totalApprovalRequests();
      await registryContract.connect(deployerSigner).applyMilestone(loanId);
      await governanceContract
        .connect(delegator1Signer)
        .voteForRequest(approvalRequest, true);
      await governanceContract
        .connect(delegator2Signer)
        .voteForRequest(approvalRequest, true);

      await increaseTime(deployerSigner.provider, +milestoneDurations[i]);
    }

    const convertibleAmountLender0 =
      await registryContract.getAvailableFundingNFTForConversion(
        loanId,
        lender1
      );
    const expectedAmount = bigPartition
      .mul(amountRequestedPerMilestone[0].add(amountRequestedPerMilestone[1]))
      .div(totalAmountRequested);

    expect(convertibleAmountLender0.toNumber()).to.be.equal(
      expectedAmount.toNumber()
    );

    const balanceLenderBefore = await projectTokenContract.balanceOf(lender1);
    const balanceEscrowBefore = await projectTokenContract.balanceOf(
      escrowContract.address
    );
    const balanceNFTLenderBefore =
      await registryContract.balanceOfAllFundingNFTGenerations(loanId, lender1);

    // Test getter first
    const getterProjectTokenAmount = await registryContract
      .connect(lender1Signer)
      .getAmountOfProjectTokensToReceive(loanId, convertibleAmountLender0);
    // Request to receive project tokens as repayment
    const tx1 = await registryContract
      .connect(lender1Signer)
      .receivePayment(loanId, convertibleAmountLender0, true);

    const balanceNFTLenderAfter =
      await registryContract.balanceOfAllFundingNFTGenerations(loanId, lender1);
    const balanceLenderAfter = await projectTokenContract.balanceOf(lender1);
    const balanceEscrowAfter = await projectTokenContract.balanceOf(
      escrowContract.address
    );
    const loanPayments = await registryContract.projectLoanPayments(loanId);
    const expectedAmountToReceive = convertibleAmountLender0.mul(
      ethers.utils.parseEther(BASE_AMOUNT + '')
    );
    const tokenPrice = await registryContract.getProjectTokenPrice(loanId);
    const discountedPrice = tokenPrice.sub(
      tokenPrice
        .mul(loanPayments.discountPerMillion)
        .div(BigNumber.from(1000000))
    );
    const expectedProjectTokenAmount =
      expectedAmountToReceive.div(discountedPrice);
    const remainingLendingAmountToPayBack = totalAmountRequested.sub(
      expectedAmountToReceive
    );
    const amountToBeRepaid = remainingLendingAmountToPayBack.add(
      remainingLendingAmountToPayBack
        .mul(interestPercentage)
        .div(BigNumber.from(100))
    );

    // Correct balances
    expect(getterProjectTokenAmount.toString()).to.be.equal(
      expectedProjectTokenAmount.toString()
    );
    expect(
      balanceNFTLenderBefore.sub(convertibleAmountLender0).toString()
    ).to.be.equal(balanceNFTLenderAfter.toString());
    expect(
      balanceLenderBefore.add(expectedProjectTokenAmount).toString()
    ).to.be.equal(balanceLenderAfter.toString());
    expect(
      balanceEscrowBefore.sub(expectedProjectTokenAmount).toString()
    ).to.be.equal(balanceEscrowAfter.toString());
    // TODO: check balances of token from generation 1

    // Correct partitions paid in project tokens tracked and updated amount to settle the loan
    expect(loanPayments.partitionsPaidInProjectTokens.toString()).to.be.equal(
      convertibleAmountLender0.toString()
    );
    const amountToBeRepaidLoanId = await registryContract.getAmountToBeRepaid(
      loanId
    );
    expect(amountToBeRepaidLoanId.toString()).to.be.equal(
      amountToBeRepaid.toString()
    );

    // Correct Event.
    expectEvent(tx1.receipt, 'PaymentReceived', {
      loanId,
      amountOfTokens: convertibleAmountLender0,
      generation: BigNumber.from(0),
      onProjectTokens: true,
      user: lender1,
    });
    expectEvent(tx1.receipt, 'ProjectTokenPaymentReceived', {
      loanId,
      user: lender1,
      amountOfProjectTokens: expectedProjectTokenAmount,
      discountedPrice,
    });
  });

  it('when all NFT can be converted after delivering the third milestone', async function () {
    const {lender1} = await getNamedAccounts();

    const {deployerSigner, delegator1Signer, delegator2Signer} =
      await getSigners();

    const milestonesToDeliver = 3;
    for (let i = 0; i < milestonesToDeliver; i++) {
      approvalRequest = await this.governance.totalApprovalRequests();
      await registryContract.connect(deployerSigner).applyMilestone(loanId);
      await governanceContract
        .connect(delegator1Signer)
        .voteForRequest(approvalRequest, true);
      await governanceContract
        .connect(delegator2Signer)
        .voteForRequest(approvalRequest, true);

      await increaseTime(deployerSigner.provider, +milestoneDurations[i]);
    }

    const convertibleAmountLender0 =
      await registryContract.getAvailableFundingNFTForConversion(
        loanId,
        lender1
      );
    const expectedAmount = bigPartition;

    expect(convertibleAmountLender0.toString()).to.be.equal(
      expectedAmount.toString()
    );
  });
});
