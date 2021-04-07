import BN from 'bn.js';
import { toWei } from 'web3-utils';
import { expect } from 'chai';
import { RepaymentBatchType, LoanType, LoanStatus } from '../../helpers/registryEnums';
import { ONE_DAY, BASE_AMOUNT, DAO_LOAN_APPROVAL } from "../../helpers/constants";
import { getTransactionTimestamp, increaseTime } from "../../helpers/time";

const repaymentBatchTypeVariations = [RepaymentBatchType.ONLY_INTEREST, RepaymentBatchType.INTEREST_PLUS_NOMINAL];

export default async function suite() {
  for(const repaymentBatchType of repaymentBatchTypeVariations) {
    describe('Succeeds', async () => {
      let loanId: BN;
      let totalPartitions: BN;
      let bigPartition: BN;
      let startingBorrowerLendingBalance: BN;
      let batchTimeInterval: BN;
      let amountEachBatch: BN;
      let lendingAmount: BN;
      let timeInterval: BN;
      let firstBatchEndingTimestamp: BN;

      beforeEach(async function () {
        loanId = new BN(await this.registry.totalLoans());
        const approvalRequest = new BN(await this.governance.totalApprovalRequests());
        totalPartitions = new BN(100);
        bigPartition = new BN(50);
        startingBorrowerLendingBalance = new BN(await this.lendingToken.balanceOf(this.escrow.address));

        const amountRequested = totalPartitions.mul(new BN(toWei(BASE_AMOUNT.toString())));
        const amountCollateralized = new BN(toWei('20000'));
        const totalAmountOfBatches = new BN(2);
        const interestPercentage = new BN(20);
        batchTimeInterval = new BN(20 * ONE_DAY);
        const ipfsHash = web3.utils.keccak256('0x01'); // Dummy hash for testing.

        await this.registry.requestPersonalLoan(
          amountRequested.toString(),
          this.collateralToken.address,
          amountCollateralized.toString(),
          totalAmountOfBatches,
          interestPercentage,
          batchTimeInterval,
          ipfsHash,
          repaymentBatchType,
          { from: this.borrower }
        );

        await this.governance.voteForRequest(approvalRequest, true, { from: this.delegators[0] });
        await this.governance.voteForRequest(approvalRequest, true, { from: this.delegators[1] });

        await this.registry.fundLoan(loanId, bigPartition, { from: this.lenders[0] });
        await this.registry.fundLoan(loanId, bigPartition, { from: this.lenders[1] });

        const loanDetails = await this.registry.loanDetails(loanId);
        const loanPayments = await this.registry.personalLoanPayments(loanId);

        lendingAmount = loanDetails.lendingAmount;
        amountEachBatch = loanPayments.amountEachBatch;
        timeInterval = loanPayments.timeIntervalBetweenBatches;
        firstBatchEndingTimestamp = loanPayments.batchDeadlineTimestamp;

        startingBorrowerLendingBalance = new BN(await this.lendingToken.balanceOf(this.borrower));
      });

      it(`when repaying a loan which is ${
        repaymentBatchType == RepaymentBatchType.ONLY_INTEREST ? "only interest" : "interest plus nominal"
      }`, async function () {
        let initBorrowerLendingBalance = new BN(await this.lendingToken.balanceOf(this.borrower));
        let initEscrowLendingBalance = new BN(await this.lendingToken.balanceOf(this.escrow.address));
        const initCollateralBalance = new BN(await this.collateralToken.balanceOf(this.borrower));
        const loanDetails = await this.registry.loanDetails(loanId);

        await this.registry.executePayment(loanId, { from: this.borrower });

        let newBorrowerLendingBalance = new BN(await this.lendingToken.balanceOf(this.borrower));
        let newEscrowLendingBalance = new BN(await this.lendingToken.balanceOf(this.escrow.address));

        let loanPayments = await this.registry.personalLoanPayments(loanId);

        // Correct Balances.
        expect(initBorrowerLendingBalance.sub(newBorrowerLendingBalance)).to.be.bignumber.equal(amountEachBatch);
        expect(newEscrowLendingBalance.sub(initEscrowLendingBalance)).to.be.bignumber.equal(amountEachBatch);

        // Correct Payments.
        expect(loanPayments.batchesPaid).to.be.bignumber.equal(new BN(1));
        expect(loanPayments.batchStartingTimestamp).to.be.bignumber.equal(firstBatchEndingTimestamp);
        expect(loanPayments.batchDeadlineTimestamp).to.be.bignumber.equal(firstBatchEndingTimestamp.add(timeInterval));

        initBorrowerLendingBalance = new BN(await this.lendingToken.balanceOf(this.borrower));
        initEscrowLendingBalance = new BN(await this.lendingToken.balanceOf(this.escrow.address));

        await increaseTime(timeInterval);

        await this.registry.executePayment(loanId, { from: this.borrower });

        newBorrowerLendingBalance = new BN(await this.lendingToken.balanceOf(this.borrower));
        newEscrowLendingBalance = new BN(await this.lendingToken.balanceOf(this.escrow.address));

        loanPayments = await this.registry.personalLoanPayments(loanId);
        const loanStatus = await this.registry.loanStatus(loanId);

        const amountLastBatch = repaymentBatchType === RepaymentBatchType.ONLY_INTEREST ?
          amountEachBatch.add(lendingAmount) :
          amountEachBatch;

        const newCollateralBalance = new BN(await this.collateralToken.balanceOf(this.borrower));

        // Correct Status.
        expect(loanStatus).to.be.bignumber.equal(LoanStatus.SETTLED);

        // Correct Balances.
        expect(initBorrowerLendingBalance.sub(newBorrowerLendingBalance)).to.be.bignumber.equal(amountLastBatch);
        expect(newEscrowLendingBalance.sub(initEscrowLendingBalance)).to.be.bignumber.equal(amountLastBatch);

        // Correct Payments.
        expect(loanPayments.batchesPaid).to.be.bignumber.equal(new BN(2));

        // Correct Collateral amount
        expect(newCollateralBalance.sub(initCollateralBalance)).to.be.bignumber.equal(loanDetails.collateralAmount);
      });
    });
  }
}
