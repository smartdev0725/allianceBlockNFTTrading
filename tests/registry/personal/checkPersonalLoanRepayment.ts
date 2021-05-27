import {expect} from 'chai';
import {RepaymentBatchType, LoanStatus} from '../../helpers/registryEnums';
import {increaseTime} from '../../helpers/time';
import {BASE_AMOUNT} from '../../helpers/constants';
import {ethers} from 'hardhat';
import {BigNumber} from 'ethers';

const repaymentBatchTypeVariations = [
  RepaymentBatchType.ONLY_INTEREST,
  RepaymentBatchType.INTEREST_PLUS_NOMINAL,
];

export default async function suite() {
  for (const repaymentBatchType of repaymentBatchTypeVariations) {
    describe('Personal loan repayment', async () => {
      let startingSeekerLendingBalance: BigNumber;
      let amountEachBatch: BigNumber;
      let lendingAmount: BigNumber;
      let timeInterval: BigNumber;
      let firstBatchEndingTimestamp: BigNumber;

      beforeEach(async function () {
        const approvalRequest =
          await this.governanceContract.totalApprovalRequests();
        this.loanId = await this.registryContract.totalLoans();
        const amountRequested = this.totalPartitions.mul(
          ethers.utils.parseEther(BASE_AMOUNT + '')
        );
        const amountCollateralized = ethers.utils.parseEther('20000');
        const totalAmountOfBatches = BigNumber.from(2);
        const interestPercentage = BigNumber.from(20);
        const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ'; // Dummy hash for testing.

        await this.registryContract
          .connect(this.seekerSigner)
          .requestPersonalLoan(
            amountRequested,
            this.collateralTokenContract.address,
            amountCollateralized,
            totalAmountOfBatches,
            interestPercentage,
            this.batchTimeInterval,
            ipfsHash,
            repaymentBatchType
          );

        await this.governanceContract
          .connect(this.superDelegatorSigner)
          .superVoteForRequest(approvalRequest, true);

        await this.registryContract
          .connect(this.lender1Signer)
          .fundLoan(this.loanId, this.bigPartition);
        await this.registryContract
          .connect(this.lender2Signer)
          .fundLoan(this.loanId, this.bigPartition);

        const loanDetails = await this.registryContract.loanDetails(
          this.loanId
        );
        const loanPayments = await this.registryContract.personalLoanPayments(
          this.loanId
        );

        startingSeekerLendingBalance =
          await this.lendingTokenContract.balanceOf(this.seeker);
        amountEachBatch = loanPayments.amountEachBatch;
        lendingAmount = loanDetails.lendingAmount;
        timeInterval = loanPayments.timeIntervalBetweenBatches;
        firstBatchEndingTimestamp = loanPayments.batchDeadlineTimestamp;
      });

      it(`when repaying a loan which is ${
        repaymentBatchType == RepaymentBatchType.ONLY_INTEREST
          ? 'only interest'
          : 'interest plus nominal'
      }`, async function () {
        let initSeekerLendingBalance =
          await this.lendingTokenContract.balanceOf(this.seeker);
        let initEscrowLendingBalance =
          await this.lendingTokenContract.balanceOf(
            this.escrowContract.address
          );
        const initCollateralBalance =
          await this.collateralTokenContract.balanceOf(this.seeker);
        const loanDetails = await this.registryContract.loanDetails(
          this.loanId
        );

        await this.registryContract
          .connect(this.seekerSigner)
          .executePayment(this.loanId);

        let newSeekerLendingBalance = await this.lendingTokenContract.balanceOf(
          this.seeker
        );
        let newEscrowLendingBalance = await this.lendingTokenContract.balanceOf(
          this.escrowContract.address
        );

        let loanPayments = await this.registryContract.personalLoanPayments(
          this.loanId
        );

        // Correct Balances.
        expect(
          initSeekerLendingBalance.sub(newSeekerLendingBalance).toString()
        ).to.be.equal(amountEachBatch.toString());
        expect(
          newEscrowLendingBalance.sub(initEscrowLendingBalance).toString()
        ).to.be.equal(amountEachBatch.toString());

        // Correct Payments.
        expect(loanPayments.batchesPaid.toString()).to.be.equal('1');
        expect(loanPayments.batchStartingTimestamp.toString()).to.be.equal(
          firstBatchEndingTimestamp.toString()
        );
        expect(loanPayments.batchDeadlineTimestamp.toString()).to.be.equal(
          firstBatchEndingTimestamp.add(timeInterval).toString()
        );

        initSeekerLendingBalance = await this.lendingTokenContract.balanceOf(
          this.seeker
        );
        initEscrowLendingBalance = await this.lendingTokenContract.balanceOf(
          this.escrowContract.address
        );

        await increaseTime(this.deployerSigner.provider, 30 * 24 * 60 * 60);

        await this.registryContract
          .connect(this.seekerSigner)
          .executePayment(this.loanId);

        newSeekerLendingBalance = await this.lendingTokenContract.balanceOf(
          this.seeker
        );
        newEscrowLendingBalance = await this.lendingTokenContract.balanceOf(
          this.escrowContract.address
        );

        loanPayments = await this.registryContract.personalLoanPayments(
          this.loanId
        );
        const loanStatus = await this.registryContract.loanStatus(this.loanId);

        const amountLastBatch =
          repaymentBatchType === RepaymentBatchType.ONLY_INTEREST
            ? amountEachBatch.add(lendingAmount)
            : amountEachBatch;
        const newCollateralBalance =
          await this.collateralTokenContract.balanceOf(this.seeker);

        // Correct Status.
        expect(loanStatus.toString()).to.be.equal(LoanStatus.SETTLED);

        // Correct Balances.
        expect(
          initSeekerLendingBalance.sub(newSeekerLendingBalance).toString()
        ).to.be.equal(amountLastBatch.toString());
        expect(
          newEscrowLendingBalance.sub(initEscrowLendingBalance).toString()
        ).to.be.equal(amountLastBatch.toString());

        // Correct Payments.
        expect(loanPayments.batchesPaid.toString()).to.be.equal('2');

        // Correct Collateral amount
        expect(
          newCollateralBalance.sub(initCollateralBalance).toString()
        ).to.be.equal(loanDetails.collateralAmount.toString());
      });
    });
  }
}
