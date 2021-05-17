import { expect } from 'chai';
import { RepaymentBatchType, LoanStatus } from '../../helpers/registryEnums';
import { ONE_DAY, BASE_AMOUNT } from "../../helpers/constants";
import { increaseTime } from "../../helpers/time";
import {getContracts, getSigners, initializeTransfers} from "../../helpers/utils";
import {deployments, getNamedAccounts, ethers} from "hardhat";
import {BigNumber} from 'ethers';

const repaymentBatchTypeVariations = [RepaymentBatchType.ONLY_INTEREST, RepaymentBatchType.INTEREST_PLUS_NOMINAL];

for(const repaymentBatchType of repaymentBatchTypeVariations) {
  describe('Personal loan repayment', async () => {
    let loanId: BigNumber;
    let totalPartitions: BigNumber;
    let bigPartition: BigNumber;
    let startingSeekerLendingBalance: BigNumber;
    let batchTimeInterval: BigNumber;
    let amountEachBatch: BigNumber;
    let lendingAmount: BigNumber;
    let timeInterval: BigNumber;
    let firstBatchEndingTimestamp: BigNumber;
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
      const approvalRequest = await governanceContract.totalApprovalRequests();
      totalPartitions = BigNumber.from(100);
      bigPartition = BigNumber.from(50);
      startingSeekerLendingBalance = await lendingTokenContract.balanceOf(escrowContract.address);

      const amountRequested = totalPartitions.mul(ethers.utils.parseEther(BASE_AMOUNT + ''));
      const amountCollateralized = ethers.utils.parseEther('20000');
      const totalAmountOfBatches = BigNumber.from(2);
      const interestPercentage = BigNumber.from(20);
      batchTimeInterval = BigNumber.from(20 * ONE_DAY);
      const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ'; // Dummy hash for testing.

      await registryContract.connect(deployerSigner).requestPersonalLoan(
        amountRequested.toString(),
        collateralTokenContract.address,
        amountCollateralized.toString(),
        totalAmountOfBatches,
        interestPercentage,
        batchTimeInterval,
        ipfsHash,
        repaymentBatchType,
      );

      await governanceContract.connect(delegator1Signer).voteForRequest(approvalRequest, true);
      await governanceContract.connect(delegator2Signer).voteForRequest(approvalRequest, true);

      await registryContract.connect(lender1Signer).fundLoan(loanId, bigPartition);
      await registryContract.connect(lender2Signer).fundLoan(loanId, bigPartition);

      const loanDetails = await registryContract.loanDetails(loanId);
      const loanPayments = await registryContract.personalLoanPayments(loanId);

      lendingAmount = loanDetails.lendingAmount;
      amountEachBatch = loanPayments.amountEachBatch;
      timeInterval = loanPayments.timeIntervalBetweenBatches;
      firstBatchEndingTimestamp = loanPayments.batchDeadlineTimestamp;

      startingSeekerLendingBalance = await lendingTokenContract.balanceOf(seeker);
    });

    it(`when repaying a loan which is ${
      repaymentBatchType == RepaymentBatchType.ONLY_INTEREST ? "only interest" : "interest plus nominal"
    }`, async function () {
      const {seeker} = await getNamedAccounts();
      const {deployerSigner, seekerSigner} = await getSigners();

      let initSeekerLendingBalance = await lendingTokenContract.balanceOf(seeker);
      let initEscrowLendingBalance = await lendingTokenContract.balanceOf(escrowContract.address);
      const initCollateralBalance = await collateralTokenContract.balanceOf(seeker);
      const loanDetails = await registryContract.loanDetails(loanId);

      await registryContract.connect(seekerSigner).executePayment(loanId);

      let newSeekerLendingBalance = await lendingTokenContract.balanceOf(seeker);
      let newEscrowLendingBalance = await lendingTokenContract.balanceOf(escrowContract.address);

      let loanPayments = await registryContract.personalLoanPayments(loanId);

      // Correct Balances.
      expect(initSeekerLendingBalance.sub(newSeekerLendingBalance).toString()).to.be.equal(amountEachBatch.toString());
      expect(newEscrowLendingBalance.sub(initEscrowLendingBalance).toString()).to.be.equal(amountEachBatch.toString());

      // Correct Payments.
      expect(loanPayments.batchesPaid.toString()).to.be.equal("1");
      expect(loanPayments.batchStartingTimestamp.toString()).to.be.equal(firstBatchEndingTimestamp.toString());
      expect(loanPayments.batchDeadlineTimestamp.toString()).to.be.equal(firstBatchEndingTimestamp.add(timeInterval).toString());

      initSeekerLendingBalance = await lendingTokenContract.balanceOf(seeker);
      initEscrowLendingBalance = await lendingTokenContract.balanceOf(escrowContract.address);

      await increaseTime(deployerSigner.provider, 30 * 24 * 60 * 60);

      await registryContract.connect(seekerSigner).executePayment(loanId);

      newSeekerLendingBalance = await lendingTokenContract.balanceOf(seeker);
      newEscrowLendingBalance = await lendingTokenContract.balanceOf(escrowContract.address);

      loanPayments = await registryContract.personalLoanPayments(loanId);
      const loanStatus = await registryContract.loanStatus(loanId);

      const amountLastBatch = repaymentBatchType === RepaymentBatchType.ONLY_INTEREST ?
        amountEachBatch.add(lendingAmount) :
        amountEachBatch;

      const newCollateralBalance = await collateralTokenContract.balanceOf(seeker);

      // Correct Status.
      expect(loanStatus.toString()).to.be.equal(LoanStatus.SETTLED);

      // Correct Balances.
      expect(initSeekerLendingBalance.sub(newSeekerLendingBalance).toString()).to.be.equal(amountLastBatch.toString());
      expect(newEscrowLendingBalance.sub(initEscrowLendingBalance).toString()).to.be.equal(amountLastBatch.toString());

      // Correct Payments.
      expect(loanPayments.batchesPaid.toString()).to.be.equal("2");

      // Correct Collateral amount
      expect(newCollateralBalance.sub(initCollateralBalance).toString()).to.be.equal(loanDetails.collateralAmount.toString());
    });
  });
}
