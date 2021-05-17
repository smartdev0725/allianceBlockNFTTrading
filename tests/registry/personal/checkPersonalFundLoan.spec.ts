import BN from 'bn.js';
import { expect } from 'chai';
import { RepaymentBatchType, LoanType, LoanStatus } from '../../helpers/registryEnums';
import { ONE_DAY, BASE_AMOUNT, DAO_LOAN_APPROVAL } from "../../helpers/constants";
import { getTransactionTimestamp } from "../../helpers/time";
import {BigNumber} from 'ethers';
import {getContracts, getSigners, initializeTransfers} from "../../helpers/utils";
import {deployments, ethers, getNamedAccounts} from "hardhat";

describe('Personal fund loan', async () => {
  let loanId: BigNumber;
  let totalPartitions: BigNumber;
  let bigPartition: BigNumber;
  let smallPartition: BigNumber;
  let bigPartitionAmountToPurchase: BigNumber;
  let smallPartitionAmountToPurchase: BigNumber;
  let startingEscrowLendingBalance: BigNumber;
  let batchTimeInterval: BigNumber;
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
      delegator1Signer,
      delegator2Signer,
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
    const approvalRequest = await governanceContract.totalApprovalRequests();
    totalPartitions = BigNumber.from(100);
    bigPartition = BigNumber.from(50);
    smallPartition = BigNumber.from(25);
    bigPartitionAmountToPurchase = bigPartition.mul(ethers.utils.parseEther(BASE_AMOUNT + ''));
    smallPartitionAmountToPurchase = smallPartition.mul(ethers.utils.parseEther(BASE_AMOUNT + ''));
    startingEscrowLendingBalance = await lendingTokenContract.balanceOf(escrowContract.address);

    const amountRequested = totalPartitions.mul(ethers.utils.parseEther(BASE_AMOUNT + ''));
    const amountCollateralized = ethers.utils.parseEther('20000');
    const totalAmountOfBatches = BigNumber.from(2);
    const interestPercentage = BigNumber.from(20);
    batchTimeInterval = BigNumber.from(20 * ONE_DAY);
    const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ'; // Dummy hash for testing.

    await registryContract.connect(deployerSigner).requestPersonalLoan(
      amountRequested.toString(),
      collateralTokenContract.address,
      amountCollateralized,
      totalAmountOfBatches,
      interestPercentage,
      batchTimeInterval,
      ipfsHash,
      RepaymentBatchType.ONLY_INTEREST
    );

    await governanceContract.connect(delegator1Signer).voteForRequest(approvalRequest, true);
    await governanceContract.connect(delegator2Signer).voteForRequest(approvalRequest, true);
  });

  it('when funding a loan', async function () {
    const {deployer, seeker, lender1, lender2} = await getNamedAccounts();
    const {lender1Signer, lender2Signer} = await getSigners();

    const initSeekerLendingBalance = await lendingTokenContract.balanceOf(seeker);
    let initEscrowLendingBalance = await lendingTokenContract.balanceOf(escrowContract.address);
    let initEscrowFundingNftBalance = await fundingNFTContract.balanceOf(escrowContract.address, loanId);
    let initLenderLendingBalance = await lendingTokenContract.balanceOf(lender1);
    let initLenderFundingNftBalance = await fundingNFTContract.balanceOf(lender1, loanId);

    let partitionsPurchased = BigNumber.from(0);

    await registryContract.connect(lender1Signer).fundLoan(loanId, smallPartition);

    let newEscrowLendingBalance = await lendingTokenContract.balanceOf(escrowContract.address);
    let newEscrowFundingNftBalance = await fundingNFTContract.balanceOf(escrowContract.address, loanId);
    let newLenderLendingBalance = await lendingTokenContract.balanceOf(lender1);
    let newLenderFundingNftBalance = await fundingNFTContract.balanceOf(lender1, loanId);

    partitionsPurchased = partitionsPurchased.add(smallPartition);

    let loanStatus = await registryContract.loanStatus(loanId);
    let loanDetails = await registryContract.loanDetails(loanId);

    // Correct Balances.
    expect(newEscrowLendingBalance.sub(initEscrowLendingBalance).toString()).to.be.equal(smallPartitionAmountToPurchase.toString());
    expect(initEscrowFundingNftBalance.sub(newEscrowFundingNftBalance).toString()).to.be.equal(smallPartition.toString());
    expect(initLenderLendingBalance.sub(newLenderLendingBalance).toString()).to.be.equal(smallPartitionAmountToPurchase.toString());
    expect(newLenderFundingNftBalance.sub(initLenderFundingNftBalance).toString()).to.be.equal(smallPartition.toString());

    // Correct Status.
    expect(loanStatus.toString()).to.be.equal(LoanStatus.FUNDING);

    // Correct Details.
    expect(loanDetails.partitionsPurchased.toString()).to.be.equal(partitionsPurchased.toString());

    initEscrowLendingBalance = newEscrowLendingBalance;
    initEscrowFundingNftBalance = newEscrowFundingNftBalance;
    initLenderLendingBalance = await lendingTokenContract.balanceOf(lender1);
    initLenderFundingNftBalance = await fundingNFTContract.balanceOf(lender1, loanId);

    await registryContract.connect(lender1Signer).fundLoan(loanId, smallPartition);

    newEscrowLendingBalance = await lendingTokenContract.balanceOf(escrowContract.address);
    newEscrowFundingNftBalance = await fundingNFTContract.balanceOf(escrowContract.address, loanId);
    newLenderLendingBalance = await lendingTokenContract.balanceOf(lender1);
    newLenderFundingNftBalance = await fundingNFTContract.balanceOf(lender1, loanId);

    partitionsPurchased = partitionsPurchased.add(smallPartition);

    loanStatus = await registryContract.loanStatus(loanId);
    loanDetails = await registryContract.loanDetails(loanId);

    // Correct Balances.
    expect(newEscrowLendingBalance.sub(initEscrowLendingBalance).toString()).to.be.equal(smallPartitionAmountToPurchase.toString());
    expect(initEscrowFundingNftBalance.sub(newEscrowFundingNftBalance).toString()).to.be.equal(smallPartition.toString());
    expect(initLenderLendingBalance.sub(newLenderLendingBalance).toString()).to.be.equal(smallPartitionAmountToPurchase.toString());
    expect(newLenderFundingNftBalance.sub(initLenderFundingNftBalance).toString()).to.be.equal(smallPartition.toString());

    // Correct Status.
    expect(loanStatus).to.be.equal(LoanStatus.FUNDING);

    // Correct Details.
    expect(loanDetails.partitionsPurchased.toString()).to.be.equal(partitionsPurchased.toString());

    initEscrowFundingNftBalance = newEscrowFundingNftBalance;
    initLenderLendingBalance = await lendingTokenContract.balanceOf(lender2);
    initLenderFundingNftBalance = await fundingNFTContract.balanceOf(lender2, loanId);

    const tx = await registryContract.connect(lender2Signer).fundLoan(loanId, bigPartition);

    const newSeekerLendingBalance = new BN(await this.lendingToken.balanceOf(this.seeker));

    newEscrowLendingBalance = await lendingTokenContract.balanceOf(escrowContract.address);
    newEscrowFundingNftBalance = await fundingNFTContract.balanceOf(escrowContract.address, loanId);
    newLenderLendingBalance = await lendingTokenContract.balanceOf(lender2);
    newLenderFundingNftBalance = await fundingNFTContract.balanceOf(lender2, loanId);

    partitionsPurchased = partitionsPurchased.add(bigPartition);

    loanStatus = await registryContract.loanStatus(loanId);
    loanDetails = await registryContract.loanDetails(loanId);
    const loanPayments = await registryContract.personalLoanPayments(loanId);

    // Correct Balances.
    expect(newEscrowLendingBalance.toString()).to.be.equal(startingEscrowLendingBalance.toString());
    expect(initEscrowFundingNftBalance.sub(newEscrowFundingNftBalance).toString()).to.be.equal(bigPartition.toString());
    expect(initLenderLendingBalance.sub(newLenderLendingBalance).toString()).to.be.equal(bigPartitionAmountToPurchase.toString());
    expect(newLenderFundingNftBalance.sub(initLenderFundingNftBalance).toString()).to.be.equal(bigPartition.toString());
    expect(newSeekerLendingBalance.sub(initSeekerLendingBalance).toString()).to.be.equal(loanDetails.lendingAmount.toString());

    // Correct Status.
    expect(loanStatus.toString()).to.be.equal(LoanStatus.STARTED);

    // Correct Details.
    expect(loanDetails.partitionsPurchased.toString()).to.be.equal(partitionsPurchased.toString());
    expect(loanDetails.totalPartitions.toString()).to.be.equal(partitionsPurchased.toString());
    expect(loanDetails.startingDate.toString()).to.be.equal((await getTransactionTimestamp(tx.tx)).toString());

    // Correct Payments.
    expect(loanPayments.batchStartingTimestamp.toString()).to.be.equal((await getTransactionTimestamp(tx.tx)).toString());
    expect(loanPayments.batchDeadlineTimestamp.toString()).to.be.equal(
      (await getTransactionTimestamp(tx.tx)).add(batchTimeInterval).toString());
  });
});
