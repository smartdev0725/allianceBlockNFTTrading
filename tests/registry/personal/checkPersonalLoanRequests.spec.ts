import { expect } from 'chai';
import { RepaymentBatchType, LoanType, LoanStatus } from '../../helpers/registryEnums';
import { ONE_DAY, BASE_AMOUNT, DAO_LOAN_APPROVAL } from "../../helpers/constants";
import { getTransactionTimestamp } from "../../helpers/time";
import {getContracts, getSigners, initializeTransfers} from "../../helpers/utils";
import {deployments, getNamedAccounts, ethers} from "hardhat";
const { expectEvent } = require("@openzeppelin/test-helpers");
import {BigNumber} from 'ethers';

describe('Personal loan requests', async () => {
  let loanId: BigNumber;
  let approvalRequest: BigNumber;
  let initSeekerCollateralBalance: BigNumber;
  let initEscrowCollateralBalance: BigNumber;
  let initEscrowFundingNftBalance: BigNumber;
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
    initSeekerCollateralBalance = await collateralTokenContract.balanceOf(seeker);
    initEscrowCollateralBalance = await collateralTokenContract.balanceOf(escrowContract.address);
    initEscrowFundingNftBalance =  await fundingNFTContract.balanceOf(escrowContract.address, loanId);
  });

  it('when requesting an interest only personal loan', async function () {
    const {seekerSigner} = await getSigners();
    const {seeker} = await getNamedAccounts();

    const amountRequested = ethers.utils.parseEther('10000');
    const amountCollateralized = ethers.utils.parseEther('20000');
    const totalAmountOfBatches = BigNumber.from(2);
    const interestPercentage = BigNumber.from(20);
    const batchTimeInterval = BigNumber.from(20 * ONE_DAY);
    const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ'; // Dummy hash for testing.

    const tx = await registryContract.connect(seekerSigner).requestPersonalLoan(
      amountRequested.toString(),
      collateralTokenContract.address,
      amountCollateralized.toString(),
      totalAmountOfBatches,
      interestPercentage,
      batchTimeInterval,
      ipfsHash,
      RepaymentBatchType.ONLY_INTEREST,
    );

    const totalPartitions = amountRequested.div(ethers.utils.parseEther(BASE_AMOUNT + ''));
    const totalInterest = amountRequested.mul(interestPercentage).div(BigNumber.from(100));
    const amountEachBatch = totalInterest.div(totalAmountOfBatches);

    const newSeekerCollateralBalance = await collateralTokenContract.balanceOf(seeker);
    const newEscrowCollateralBalance = await collateralTokenContract.balanceOf(escrowContract.address);
    const newEscrowFundingNftBalance =  await fundingNFTContract.balanceOf(escrowContract.address, loanId);

    const isPaused = await fundingNFTContract.transfersPaused(loanId);

    const loanStatus = await registryContract.loanStatus(loanId);
    const loanDetails = await registryContract.loanDetails(loanId);
    const loanPayments = await registryContract.personalLoanPayments(loanId);
    const daoApprovalRequest = await governanceContract.approvalRequests(approvalRequest);

    // Correct Status.
    expect(loanStatus.toString()).to.be.equal(LoanStatus.REQUESTED);

    // Correct Event.
    expectEvent(tx.receipt, 'PersonalLoanRequested', { loanId , user: this.seeker, amount: amountRequested.toString() });

    // Correct Details.
    expect(loanDetails.loanId.toString()).to.be.equal(loanId.toString());
    expect(loanDetails.loanType.toString()).to.be.equal(LoanType.PERSONAL);
    expect(loanDetails.startingDate.toString()).to.be.equal("0");
    expect(loanDetails.collateralToken.toString()).to.be.equal(collateralTokenContract.address);
    expect(loanDetails.collateralAmount.toString()).to.be.equal(amountCollateralized.toString());
    expect(loanDetails.lendingAmount.toString()).to.be.equal(amountRequested.toString());
    expect(loanDetails.totalPartitions.toString()).to.be.equal(totalPartitions.toString());
    expect(loanDetails.totalInterest.toString()).to.be.equal(totalInterest.toString());
    expect(loanDetails.extraInfo).to.be.equal(ipfsHash);
    expect(loanDetails.partitionsPurchased.toString()).to.be.equal("0");

    // Correct Payments.
    expect(loanPayments.batchesPaid.toString()).to.be.equal("0");
    expect(loanPayments.amountEachBatch.toString()).to.be.equal(amountEachBatch.toString());
    expect(loanPayments.totalAmountOfBatches.toString()).to.be.equal(totalAmountOfBatches.toString());
    expect(loanPayments.timeIntervalBetweenBatches.toString()).to.be.equal(batchTimeInterval.toString());
    expect(loanPayments.batchesSkipped.toString()).to.be.equal("0");
    expect(loanPayments.batchStartingTimestamp.toString()).to.be.equal("0");
    expect(loanPayments.batchDeadlineTimestamp.toString()).to.be.equal("0");
    expect(loanPayments.repaymentBatchType.toString()).to.be.equal(RepaymentBatchType.ONLY_INTEREST);

    // Correct Balances.
    expect(initSeekerCollateralBalance.sub(newSeekerCollateralBalance).toString()).to.be.equal(amountCollateralized.toString());
    expect(newEscrowCollateralBalance.sub(initEscrowCollateralBalance).toString()).to.be.equal(amountCollateralized.toString());
    expect(newEscrowFundingNftBalance.sub(initEscrowFundingNftBalance).toString()).to.be.equal(totalPartitions.toString());

    // Correct Nft Behavior.
    expect(isPaused).to.be.equal(true);

    // Correct Dao Request.
    expect(daoApprovalRequest.loanId.toString()).to.be.equal(loanId.toString());
    expect(daoApprovalRequest.isMilestone).to.be.equal(false);
    expect(daoApprovalRequest.milestoneNumber.toString()).to.be.equal("0");
    expect(daoApprovalRequest.deadlineTimestamp.toString()).to.be.equal(
      (await getTransactionTimestamp(tx.tx)).add(BigNumber.from(DAO_LOAN_APPROVAL)));
    expect(daoApprovalRequest.approvalsProvided.toString()).to.be.equal("0");
    expect(daoApprovalRequest.isApproved).to.be.equal(false);
  });

  it('when requesting a nominal plus interest personal loan', async function () {
    const {seekerSigner} = await getSigners();
    const {deployer, seeker, lender1, lender2} = await getNamedAccounts();

    const amountRequested = ethers.utils.parseEther('10000');
    const amountCollateralized = ethers.utils.parseEther('20000');
    const totalAmountOfBatches = BigNumber.from(2);
    const interestPercentage = BigNumber.from(20);
    const batchTimeInterval = BigNumber.from(20 * ONE_DAY);
    const ipfsHash = "QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ"

    const tx = await registryContract.connect(seekerSigner).requestPersonalLoan(
      amountRequested.toString(),
      collateralTokenContract.address,
      amountCollateralized.toString(),
      totalAmountOfBatches,
      interestPercentage,
      batchTimeInterval,
      ipfsHash,
      RepaymentBatchType.INTEREST_PLUS_NOMINAL,
    );

    const totalPartitions = amountRequested.div(ethers.utils.parseEther(BASE_AMOUNT + ''));
    const totalInterest = amountRequested.mul(interestPercentage).div(BigNumber.from(100));
    const amountEachBatch = (totalInterest.add(amountRequested)).div(totalAmountOfBatches);

    const newSeekerCollateralBalance = await collateralTokenContract.balanceOf(seeker);
    const newEscrowCollateralBalance = await collateralTokenContract.balanceOf(escrowContract.address);
    const newEscrowFundingNftBalance =  await fundingNFTContract.balanceOf(escrowContract.address, loanId);

    const isPaused = await fundingNFTContract.transfersPaused(loanId);

    const loanStatus = await registryContract.loanStatus(loanId);
    const loanDetails = await registryContract.loanDetails(loanId);
    const loanPayments = await registryContract.personalLoanPayments(loanId);
    const daoApprovalRequest = await governanceContract.approvalRequests(approvalRequest);

    // Correct Status.
    expect(loanStatus.toString()).to.be.equal(LoanStatus.REQUESTED);

    // Correct Event.
    expectEvent(tx.receipt, 'PersonalLoanRequested', { loanId , user: seeker, amount: amountRequested.toString() });

      // Correct Details.
    expect(loanDetails.loanId.toString()).to.be.equal(loanId.toString());
    expect(loanDetails.loanType.toString()).to.be.equal(LoanType.PERSONAL);
    expect(loanDetails.startingDate.toString()).to.be.equal("0");
    expect(loanDetails.collateralToken.toString()).to.be.equal(collateralTokenContract.address);
    expect(loanDetails.collateralAmount.toString()).to.be.equal(amountCollateralized.toString());
    expect(loanDetails.lendingAmount.toString()).to.be.equal(amountRequested.toString());
    expect(loanDetails.totalPartitions).to.be.equal(totalPartitions);
    expect(loanDetails.totalInterest).to.be.equal(totalInterest);
    expect(loanDetails.extraInfo).to.be.equal(ipfsHash);
    expect(loanDetails.partitionsPurchased).to.be.equal(BigNumber.from(0));

    // Correct Payments.
    expect(loanPayments.batchesPaid.toString()).to.be.equal("0");
    expect(loanPayments.amountEachBatch.toString()).to.be.equal(amountEachBatch.toString());
    expect(loanPayments.totalAmountOfBatches.toString()).to.be.equal(totalAmountOfBatches.toString());
    expect(loanPayments.timeIntervalBetweenBatches.toString()).to.be.equal(batchTimeInterval.toString());
    expect(loanPayments.batchesSkipped.toString()).to.be.equal("0");
    expect(loanPayments.batchStartingTimestamp.toString()).to.be.equal("0");
    expect(loanPayments.batchDeadlineTimestamp.toString()).to.be.equal("0");
    expect(loanPayments.repaymentBatchType.toString()).to.be.equal(RepaymentBatchType.INTEREST_PLUS_NOMINAL);

    // Correct Balances.
    expect(initSeekerCollateralBalance.sub(newSeekerCollateralBalance).toString()).to.be.equal(amountCollateralized.toString());
    expect(newEscrowCollateralBalance.sub(initEscrowCollateralBalance).toString()).to.be.equal(amountCollateralized.toString());
    expect(newEscrowFundingNftBalance.sub(initEscrowFundingNftBalance).toString()).to.be.equal(totalPartitions.toString());

    // Correct Nft Behavior.
    expect(isPaused).to.be.equal(true);

    // Correct Dao Request.
    expect(daoApprovalRequest.loanId.toString()).to.be.equal(loanId.toString());
    expect(daoApprovalRequest.isMilestone).to.be.equal(false);
    expect(daoApprovalRequest.milestoneNumber.toString()).to.be.equal("0");
    expect(daoApprovalRequest.deadlineTimestamp.toString()).to.be.equal(
      (await getTransactionTimestamp(tx.tx)).add(BigNumber.from(DAO_LOAN_APPROVAL)).toString());
    expect(daoApprovalRequest.approvalsProvided.toString()).to.be.equal("0");
    expect(daoApprovalRequest.isApproved).to.be.equal(false);
  });
});
