import BN from 'bn.js';
import { toWei } from 'web3-utils';
import { expect } from 'chai';
import { RepaymentBatchType, LoanType, LoanStatus } from '../../helpers/registryEnums';
import { ONE_DAY, BASE_AMOUNT, DAO_LOAN_APPROVAL } from "../../helpers/constants";
import { getTransactionTimestamp } from "../../helpers/time";

export default async function suite() {
  describe('Succeeds', async () => {
    let loanId: BN;
    let totalPartitions: BN;
    let bigPartition: BN;
    let smallPartition: BN;
    let bigPartitionAmountToPurchase: BN;
    let smallPartitionAmountToPurchase: BN;
    let startingEscrowLendingBalance: BN;
    let batchTimeInterval: BN;

    beforeEach(async function () {
      loanId = new BN(await this.registry.totalLoans());
      const approvalRequest = new BN(await this.governance.totalApprovalRequests());
      totalPartitions = new BN(100);
      bigPartition = new BN(50);
      smallPartition = new BN(25);
      bigPartitionAmountToPurchase = bigPartition.mul(new BN(toWei(BASE_AMOUNT.toString())));
      smallPartitionAmountToPurchase = smallPartition.mul(new BN(toWei(BASE_AMOUNT.toString())));
      startingEscrowLendingBalance = new BN(await this.lendingToken.balanceOf(this.escrow.address));

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
        RepaymentBatchType.ONLY_INTEREST,
        { from: this.borrower }
      );

      await this.governance.voteForRequest(approvalRequest, true, { from: this.delegators[0] });
      await this.governance.voteForRequest(approvalRequest, true, { from: this.delegators[1] });
    });

    it('when funding a loan', async function () {
      const initBorrowerLendingBalance = new BN(await this.lendingToken.balanceOf(this.borrower));
      let initEscrowLendingBalance = new BN(await this.lendingToken.balanceOf(this.escrow.address));
      let initEscrowLoanNftBalance =  new BN(await this.loanNft.balanceOf(this.escrow.address, loanId));
      let initLenderLendingBalance = new BN(await this.lendingToken.balanceOf(this.lenders[0]));
      let initLenderLoanNftBalance =  new BN(await this.loanNft.balanceOf(this.lenders[0], loanId));

      let partitionsPurchased = new BN(0);

      await this.registry.fundLoan(loanId, smallPartition, { from: this.lenders[0] });

      let newEscrowLendingBalance = new BN(await this.lendingToken.balanceOf(this.escrow.address));
      let newEscrowLoanNftBalance =  new BN(await this.loanNft.balanceOf(this.escrow.address, loanId));
      let newLenderLendingBalance = new BN(await this.lendingToken.balanceOf(this.lenders[0]));
      let newLenderLoanNftBalance =  new BN(await this.loanNft.balanceOf(this.lenders[0], loanId));

      partitionsPurchased = partitionsPurchased.add(smallPartition);

      let loanStatus = await this.registry.loanStatus(loanId);
      let loanDetails = await this.registry.loanDetails(loanId);

      // Correct Balances.
      expect(newEscrowLendingBalance.sub(initEscrowLendingBalance)).to.be.bignumber.equal(smallPartitionAmountToPurchase);
      expect(initEscrowLoanNftBalance.sub(newEscrowLoanNftBalance)).to.be.bignumber.equal(smallPartition);
      expect(initLenderLendingBalance.sub(newLenderLendingBalance)).to.be.bignumber.equal(smallPartitionAmountToPurchase);
      expect(newLenderLoanNftBalance.sub(initLenderLoanNftBalance)).to.be.bignumber.equal(smallPartition);

      // Correct Status.
      expect(loanStatus).to.be.bignumber.equal(LoanStatus.FUNDING);

      // Correct Details.
      expect(loanDetails.partitionsPurchased).to.be.bignumber.equal(partitionsPurchased);

      initEscrowLendingBalance = newEscrowLendingBalance;
      initEscrowLoanNftBalance =  newEscrowLoanNftBalance;
      initLenderLendingBalance = new BN(await this.lendingToken.balanceOf(this.lenders[1]));
      initLenderLoanNftBalance =  new BN(await this.loanNft.balanceOf(this.lenders[1], loanId));

      await this.registry.fundLoan(loanId, smallPartition, { from: this.lenders[1] });

      newEscrowLendingBalance = new BN(await this.lendingToken.balanceOf(this.escrow.address));
      newEscrowLoanNftBalance =  new BN(await this.loanNft.balanceOf(this.escrow.address, loanId));
      newLenderLendingBalance = new BN(await this.lendingToken.balanceOf(this.lenders[1]));
      newLenderLoanNftBalance =  new BN(await this.loanNft.balanceOf(this.lenders[1], loanId));

      partitionsPurchased = partitionsPurchased.add(smallPartition);

      loanStatus = await this.registry.loanStatus(loanId);
      loanDetails = await this.registry.loanDetails(loanId);

      // Correct Balances.
      expect(newEscrowLendingBalance.sub(initEscrowLendingBalance)).to.be.bignumber.equal(smallPartitionAmountToPurchase);
      expect(initEscrowLoanNftBalance.sub(newEscrowLoanNftBalance)).to.be.bignumber.equal(smallPartition);
      expect(initLenderLendingBalance.sub(newLenderLendingBalance)).to.be.bignumber.equal(smallPartitionAmountToPurchase);
      expect(newLenderLoanNftBalance.sub(initLenderLoanNftBalance)).to.be.bignumber.equal(smallPartition);

      // Correct Status.
      expect(loanStatus).to.be.bignumber.equal(LoanStatus.FUNDING);

      // Correct Details.
      expect(loanDetails.partitionsPurchased).to.be.bignumber.equal(partitionsPurchased);

      initEscrowLoanNftBalance =  newEscrowLoanNftBalance;
      initLenderLendingBalance = new BN(await this.lendingToken.balanceOf(this.lenders[2]));
      initLenderLoanNftBalance =  new BN(await this.loanNft.balanceOf(this.lenders[2], loanId));

      const tx = await this.registry.fundLoan(loanId, bigPartition, { from: this.lenders[2] });

      const newBorrowerLendingBalance = new BN(await this.lendingToken.balanceOf(this.borrower));

      newEscrowLendingBalance = new BN(await this.lendingToken.balanceOf(this.escrow.address));
      newEscrowLoanNftBalance =  new BN(await this.loanNft.balanceOf(this.escrow.address, loanId));
      newLenderLendingBalance = new BN(await this.lendingToken.balanceOf(this.lenders[2]));
      newLenderLoanNftBalance =  new BN(await this.loanNft.balanceOf(this.lenders[2], loanId));

      partitionsPurchased = partitionsPurchased.add(bigPartition);

      loanStatus = await this.registry.loanStatus(loanId);
      loanDetails = await this.registry.loanDetails(loanId);
      const loanPayments = await this.registry.personalLoanPayments(loanId);

      // Correct Balances.
      expect(newEscrowLendingBalance).to.be.bignumber.equal(startingEscrowLendingBalance);
      expect(initEscrowLoanNftBalance.sub(newEscrowLoanNftBalance)).to.be.bignumber.equal(bigPartition);
      expect(initLenderLendingBalance.sub(newLenderLendingBalance)).to.be.bignumber.equal(bigPartitionAmountToPurchase);
      expect(newLenderLoanNftBalance.sub(initLenderLoanNftBalance)).to.be.bignumber.equal(bigPartition);
      expect(newBorrowerLendingBalance.sub(initBorrowerLendingBalance)).to.be.bignumber.equal(loanDetails.lendingAmount);

      // Correct Status.
      expect(loanStatus).to.be.bignumber.equal(LoanStatus.STARTED);

      // Correct Details.
      expect(loanDetails.partitionsPurchased).to.be.bignumber.equal(partitionsPurchased);
      expect(loanDetails.totalPartitions).to.be.bignumber.equal(partitionsPurchased);
      expect(loanDetails.startingDate).to.be.bignumber.equal(await getTransactionTimestamp(tx.tx));

      // Correct Payments.
      expect(loanPayments.batchStartingTimestamp).to.be.bignumber.equal(await getTransactionTimestamp(tx.tx));
      expect(loanPayments.batchDeadlineTimestamp).to.be.bignumber.equal(
        (await getTransactionTimestamp(tx.tx)).add(batchTimeInterval));
    });
  });
}
