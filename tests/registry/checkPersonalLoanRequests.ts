import BN from 'bn.js';
import { toWei } from 'web3-utils';
import { expect } from 'chai';
import { RepaymentBatchType, LoanType, LoanStatus } from '../helpers/registryEnums';
import { ONE_DAY, BASE_AMOUNT, DAO_LOAN_APPROVAL } from "../helpers/constants";
import { getTransactionTimestamp } from "../helpers/time";

export default async function suite() {
  describe('Succeeds', async () => {
    let loanId: BN;
    let approvalRequest: BN;
    let initBorrowerCollateralBalance: BN;
    let initEscrowCollateralBalance: BN;
    let initEscrowLoanNftBalance: BN;

    beforeEach(async function () {
      loanId = new BN(await this.registry.totalLoans());
      approvalRequest = new BN(await this.governance.totalApprovalRequests());
      initBorrowerCollateralBalance = new BN(await this.collateralToken.balanceOf(this.borrower));
      initEscrowCollateralBalance = new BN(await this.collateralToken.balanceOf(this.escrow.address));
      initEscrowLoanNftBalance =  new BN(await this.loanNft.balanceOf(this.escrow.address, loanId));
    });

    it('when requesting an interest only personal loan', async function () {
      const amountRequested = new BN(toWei('10000'));
      const amountCollateralized = new BN(toWei('20000'));
      const totalAmountOfBatches = new BN(2);
      const interestPercentage = new BN(20);
      const batchTimeInterval = new BN(20 * ONE_DAY);
      const ipfsHash = web3.utils.keccak256('0x01'); // Dummy hash for testing.

      const tx = await this.registry.requestPersonalLoan(
        amountRequested.toString(),
        this.collateralToken.address,
        amountCollateralized.toString(),
        totalAmountOfBatches,
        interestPercentage,
        batchTimeInterval,
        ipfsHash,
        RepaymentBatchType.ONLY_INTEREST,
        { from: this.borrower }
      );

      const totalPartitions = amountRequested.div(new BN(toWei(BASE_AMOUNT.toString())));
      const totalInterest = amountRequested.mul(interestPercentage).div(new BN(100));
      const amountEachBatch = totalInterest.div(totalAmountOfBatches);

      const newBorrowerCollateralBalance = new BN(await this.collateralToken.balanceOf(this.borrower));
      const newEscrowCollateralBalance = new BN(await this.collateralToken.balanceOf(this.escrow.address));
      const newEscrowLoanNftBalance =  new BN(await this.loanNft.balanceOf(this.escrow.address, loanId));

      const isPaused = await this.loanNft.transfersPaused(loanId);

      const loanStatus = await this.registry.loanStatus(loanId);
      const loanDetails = await this.registry.loanDetails(loanId);
      const loanPayments = await this.registry.personalLoanPayments(loanId);
      const daoApprovalRequest = await this.governance.approvalRequests(approvalRequest);

      // Correct Status.
      expect(loanStatus).to.be.bignumber.equal(LoanStatus.REQUESTED);

      // Correct Details.
      expect(loanDetails.loanId).to.be.bignumber.equal(loanId);
      expect(loanDetails.loanType).to.be.bignumber.equal(LoanType.PERSONAL);
      expect(loanDetails.startingDate).to.be.bignumber.equal(new BN(0));
      expect(loanDetails.collateralToken).to.be.equal(this.collateralToken.address);
      expect(loanDetails.collateralAmount).to.be.bignumber.equal(amountCollateralized);
      expect(loanDetails.lendingAmount).to.be.bignumber.equal(amountRequested);
      expect(loanDetails.totalPartitions).to.be.bignumber.equal(totalPartitions);
      expect(loanDetails.totalInterest).to.be.bignumber.equal(totalInterest);
      expect(loanDetails.extraInfo).to.be.equal(ipfsHash);
      expect(loanDetails.partitionsPurchased).to.be.bignumber.equal(new BN(0));

      // Correct Payments.
      expect(loanPayments.batchesPaid).to.be.bignumber.equal(new BN(0));
      expect(loanPayments.amountEachBatch).to.be.bignumber.equal(amountEachBatch);
      expect(loanPayments.totalAmountOfBatches).to.be.bignumber.equal(totalAmountOfBatches);
      expect(loanPayments.timeIntervalBetweenBatches).to.be.bignumber.equal(batchTimeInterval);
      expect(loanPayments.batchesSkipped).to.be.bignumber.equal(new BN(0));
      expect(loanPayments.batchStartingTimestamp).to.be.bignumber.equal(new BN(0));
      expect(loanPayments.batchDeadlineTimestamp).to.be.bignumber.equal(new BN(0));
      expect(loanPayments.repaymentBatchType).to.be.bignumber.equal(RepaymentBatchType.ONLY_INTEREST);

      // Correct Balances.
      expect(initBorrowerCollateralBalance.sub(newBorrowerCollateralBalance)).to.be.bignumber.equal(amountCollateralized);
      expect(newEscrowCollateralBalance.sub(initEscrowCollateralBalance)).to.be.bignumber.equal(amountCollateralized);
      expect(newEscrowLoanNftBalance.sub(initEscrowLoanNftBalance)).to.be.bignumber.equal(totalPartitions);

      // Correct Nft Behavior.
      expect(isPaused).to.be.equal(true);

      // Correct Dao Request.
      expect(daoApprovalRequest.loanId).to.be.bignumber.equal(loanId);
      expect(daoApprovalRequest.isMilestone).to.be.equal(false);
      expect(daoApprovalRequest.milestoneNumber).to.be.bignumber.equal(new BN(0));
      expect(daoApprovalRequest.deadlineTimestamp).to.be.bignumber.equal(
        (await getTransactionTimestamp(tx.tx)).add(new BN(DAO_LOAN_APPROVAL)));
      expect(daoApprovalRequest.approvalsProvided).to.be.bignumber.equal(new BN(0));
      expect(daoApprovalRequest.isApproved).to.be.equal(false);
    });

    it('when requesting a nominal plus interest personal loan', async function () {
      const amountRequested = new BN(toWei('10000'));
      const amountCollateralized = new BN(toWei('20000'));
      const totalAmountOfBatches = new BN(2);
      const interestPercentage = new BN(20);
      const batchTimeInterval = new BN(20 * ONE_DAY);
      const ipfsHash = web3.utils.keccak256('0x01'); // Dummy hash for testing.

      const tx = await this.registry.requestPersonalLoan(
        amountRequested.toString(),
        this.collateralToken.address,
        amountCollateralized.toString(),
        totalAmountOfBatches,
        interestPercentage,
        batchTimeInterval,
        ipfsHash,
        RepaymentBatchType.INTEREST_PLUS_NOMINAL,
        { from: this.borrower }
      );

      const totalPartitions = amountRequested.div(new BN(toWei(BASE_AMOUNT.toString())));
      const totalInterest = amountRequested.mul(interestPercentage).div(new BN(100));
      const amountEachBatch = (totalInterest.add(amountRequested)).div(totalAmountOfBatches);

      const newBorrowerCollateralBalance = new BN(await this.collateralToken.balanceOf(this.borrower));
      const newEscrowCollateralBalance = new BN(await this.collateralToken.balanceOf(this.escrow.address));
      const newEscrowLoanNftBalance =  new BN(await this.loanNft.balanceOf(this.escrow.address, loanId));

      const isPaused = await this.loanNft.transfersPaused(loanId);

      const loanStatus = await this.registry.loanStatus(loanId);
      const loanDetails = await this.registry.loanDetails(loanId);
      const loanPayments = await this.registry.personalLoanPayments(loanId);
      const daoApprovalRequest = await this.governance.approvalRequests(approvalRequest);

      // Correct Status.
      expect(loanStatus).to.be.bignumber.equal(LoanStatus.REQUESTED);

      // Correct Details.
      expect(loanDetails.loanId).to.be.bignumber.equal(loanId);
      expect(loanDetails.loanType).to.be.bignumber.equal(LoanType.PERSONAL);
      expect(loanDetails.startingDate).to.be.bignumber.equal(new BN(0));
      expect(loanDetails.collateralToken).to.be.equal(this.collateralToken.address);
      expect(loanDetails.collateralAmount).to.be.bignumber.equal(amountCollateralized);
      expect(loanDetails.lendingAmount).to.be.bignumber.equal(amountRequested);
      expect(loanDetails.totalPartitions).to.be.bignumber.equal(totalPartitions);
      expect(loanDetails.totalInterest).to.be.bignumber.equal(totalInterest);
      expect(loanDetails.extraInfo).to.be.equal(ipfsHash);
      expect(loanDetails.partitionsPurchased).to.be.bignumber.equal(new BN(0));

      // Correct Payments.
      expect(loanPayments.batchesPaid).to.be.bignumber.equal(new BN(0));
      expect(loanPayments.amountEachBatch).to.be.bignumber.equal(amountEachBatch);
      expect(loanPayments.totalAmountOfBatches).to.be.bignumber.equal(totalAmountOfBatches);
      expect(loanPayments.timeIntervalBetweenBatches).to.be.bignumber.equal(batchTimeInterval);
      expect(loanPayments.batchesSkipped).to.be.bignumber.equal(new BN(0));
      expect(loanPayments.batchStartingTimestamp).to.be.bignumber.equal(new BN(0));
      expect(loanPayments.batchDeadlineTimestamp).to.be.bignumber.equal(new BN(0));
      expect(loanPayments.repaymentBatchType).to.be.bignumber.equal(RepaymentBatchType.INTEREST_PLUS_NOMINAL);

      // Correct Balances.
      expect(initBorrowerCollateralBalance.sub(newBorrowerCollateralBalance)).to.be.bignumber.equal(amountCollateralized);
      expect(newEscrowCollateralBalance.sub(initEscrowCollateralBalance)).to.be.bignumber.equal(amountCollateralized);
      expect(newEscrowLoanNftBalance.sub(initEscrowLoanNftBalance)).to.be.bignumber.equal(totalPartitions);

      // Correct Nft Behavior.
      expect(isPaused).to.be.equal(true);

      // Correct Dao Request.
      expect(daoApprovalRequest.loanId).to.be.bignumber.equal(loanId);
      expect(daoApprovalRequest.isMilestone).to.be.equal(false);
      expect(daoApprovalRequest.milestoneNumber).to.be.bignumber.equal(new BN(0));
      expect(daoApprovalRequest.deadlineTimestamp).to.be.bignumber.equal(
        (await getTransactionTimestamp(tx.tx)).add(new BN(DAO_LOAN_APPROVAL)));
      expect(daoApprovalRequest.approvalsProvided).to.be.bignumber.equal(new BN(0));
      expect(daoApprovalRequest.isApproved).to.be.equal(false);
    });
  });
}
