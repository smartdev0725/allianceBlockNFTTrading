import {expect} from 'chai';
import {
  RepaymentBatchType,
  LoanType,
  LoanStatus,
} from '../../helpers/registryEnums';
import {ONE_DAY, BASE_AMOUNT, DAO_LOAN_APPROVAL} from '../../helpers/constants';
import {getTransactionTimestamp} from '../../helpers/time';
import {deployments, getNamedAccounts, ethers} from 'hardhat';
const {expectEvent} = require('@openzeppelin/test-helpers');
import {BigNumber} from 'ethers';

export default async function suite() {
  describe('Personal loan requests', async () => {
    it('when requesting an interest only personal loan', async function () {
      const loanId = await this.registryContract.totalLoans();
      const approvalRequest =
        await this.governanceContract.totalApprovalRequests();
      let initSeekerCollateralBalance =
        await this.collateralTokenContract.balanceOf(this.seeker);
      let initEscrowCollateralBalance =
        await this.collateralTokenContract.balanceOf(
          this.escrowContract.address
        );
      let initEscrowFundingNftBalance = await this.fundingNFTContract.balanceOf(
        this.escrowContract.address,
        loanId
      );

      const amountRequested = ethers.utils.parseEther('10000');
      const amountCollateralized = ethers.utils.parseEther('20000');
      const totalAmountOfBatches = BigNumber.from(2);
      const interestPercentage = BigNumber.from(20);
      const batchTimeInterval = BigNumber.from(20 * ONE_DAY);
      const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ'; // Dummy hash for testing.

      const tx = await this.registryContract
        .connect(this.seekerSigner)
        .requestPersonalLoan(
          amountRequested,
          this.collateralTokenContract.address,
          amountCollateralized,
          totalAmountOfBatches,
          interestPercentage,
          batchTimeInterval,
          ipfsHash,
          RepaymentBatchType.ONLY_INTEREST
        );

      const totalPartitions = amountRequested.div(
        ethers.utils.parseEther(BASE_AMOUNT + '')
      );
      const totalInterest = amountRequested
        .mul(interestPercentage)
        .div(BigNumber.from(100));
      const amountEachBatch = totalInterest.div(totalAmountOfBatches);

      const newSeekerCollateralBalance =
        await this.collateralTokenContract.balanceOf(this.seeker);
      const newEscrowCollateralBalance =
        await this.collateralTokenContract.balanceOf(
          this.escrowContract.address
        );
      const newEscrowFundingNftBalance =
        await this.fundingNFTContract.balanceOf(
          this.escrowContract.address,
          loanId
        );

      const isPaused = await this.fundingNFTContract.transfersPaused(loanId);

      const loanStatus = await this.registryContract.loanStatus(loanId);
      const loanDetails = await this.registryContract.loanDetails(loanId);
      const loanPayments = await this.registryContract.personalLoanPayments(
        loanId
      );
      const daoApprovalRequest = await this.governanceContract.approvalRequests(
        approvalRequest
      );

      // Correct Status.
      expect(loanStatus.toString()).to.be.equal(LoanStatus.REQUESTED);

      // Correct Event.
      expectEvent(tx.receipt, 'PersonalLoanRequested', {
        loanId,
        user: this.seeker,
        amount: amountRequested.toString(),
      });

      // Correct Details.
      expect(loanDetails.loanId.toString()).to.be.equal(loanId.toString());
      expect(loanDetails.loanType.toString()).to.be.equal(LoanType.PERSONAL);
      expect(loanDetails.startingDate.toString()).to.be.equal('0');
      expect(loanDetails.collateralToken.toString()).to.be.equal(
        this.collateralTokenContract.address
      );
      expect(loanDetails.collateralAmount.toString()).to.be.equal(
        amountCollateralized.toString()
      );
      expect(loanDetails.lendingAmount.toString()).to.be.equal(
        amountRequested.toString()
      );
      expect(loanDetails.totalPartitions.toString()).to.be.equal(
        totalPartitions.toString()
      );
      expect(loanDetails.totalInterest.toString()).to.be.equal(
        totalInterest.toString()
      );
      expect(loanDetails.extraInfo).to.be.equal(ipfsHash);
      expect(loanDetails.partitionsPurchased.toString()).to.be.equal('0');

      // Correct Payments.
      expect(loanPayments.batchesPaid.toString()).to.be.equal('0');
      expect(loanPayments.amountEachBatch.toString()).to.be.equal(
        amountEachBatch.toString()
      );
      expect(loanPayments.totalAmountOfBatches.toString()).to.be.equal(
        totalAmountOfBatches.toString()
      );
      expect(loanPayments.timeIntervalBetweenBatches.toString()).to.be.equal(
        batchTimeInterval.toString()
      );
      expect(loanPayments.batchesSkipped.toString()).to.be.equal('0');
      expect(loanPayments.batchStartingTimestamp.toString()).to.be.equal('0');
      expect(loanPayments.batchDeadlineTimestamp.toString()).to.be.equal('0');
      expect(loanPayments.repaymentBatchType.toString()).to.be.equal(
        RepaymentBatchType.ONLY_INTEREST
      );

      // Correct Balances.
      expect(
        initSeekerCollateralBalance.sub(newSeekerCollateralBalance).toString()
      ).to.be.equal(amountCollateralized.toString());
      expect(
        newEscrowCollateralBalance.sub(initEscrowCollateralBalance).toString()
      ).to.be.equal(amountCollateralized.toString());
      expect(
        newEscrowFundingNftBalance.sub(initEscrowFundingNftBalance).toString()
      ).to.be.equal(totalPartitions.toString());

      // Correct Nft Behavior.
      expect(isPaused).to.be.equal(true);

      // Correct Dao Request.
      expect(daoApprovalRequest.loanId.toString()).to.be.equal(
        loanId.toString()
      );
      expect(daoApprovalRequest.isMilestone).to.be.equal(false);
      expect(daoApprovalRequest.milestoneNumber.toString()).to.be.equal('0');
      expect(daoApprovalRequest.deadlineTimestamp.toString()).to.be.equal(
        (await getTransactionTimestamp(tx.tx)).add(
          BigNumber.from(DAO_LOAN_APPROVAL)
        )
      );
      expect(daoApprovalRequest.approvalsProvided.toString()).to.be.equal('0');
      expect(daoApprovalRequest.isApproved).to.be.equal(false);
    });

    it('when requesting a nominal plus interest personal loan', async function () {
      const loanId = await this.registryContract.totalLoans();
      let initSeekerCollateralBalance =
        await this.collateralTokenContract.balanceOf(this.seeker);
      let initEscrowCollateralBalance =
        await this.collateralTokenContract.balanceOf(
          this.escrowContract.address
        );
      let initEscrowFundingNftBalance = await this.fundingNFTContract.balanceOf(
        this.escrowContract.address,
        loanId
      );

      const amountRequested = ethers.utils.parseEther('10000');
      const amountCollateralized = ethers.utils.parseEther('20000');
      const totalAmountOfBatches = BigNumber.from(2);
      const interestPercentage = BigNumber.from(20);
      const batchTimeInterval = BigNumber.from(20 * ONE_DAY);
      const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

      const tx = await this.registryContract
        .connect(this.seekerSigner)
        .requestPersonalLoan(
          amountRequested,
          this.collateralTokenContract.address,
          amountCollateralized,
          totalAmountOfBatches,
          interestPercentage,
          batchTimeInterval,
          ipfsHash,
          RepaymentBatchType.INTEREST_PLUS_NOMINAL
        );

      const totalPartitions = amountRequested.div(
        ethers.utils.parseEther(BASE_AMOUNT + '')
      );
      const totalInterest = amountRequested
        .mul(interestPercentage)
        .div(BigNumber.from(100));
      const amountEachBatch = totalInterest
        .add(amountRequested)
        .div(totalAmountOfBatches);

      const newSeekerCollateralBalance =
        await this.collateralTokenContract.balanceOf(this.seeker);
      const newEscrowCollateralBalance =
        await this.collateralTokenContract.balanceOf(
          this.escrowContract.address
        );
      const newEscrowFundingNftBalance =
        await this.fundingNFTContract.balanceOf(
          this.escrowContract.address,
          this.loanId
        );

      const isPaused = await this.fundingNFTContract.transfersPaused(
        this.loanId
      );

      const loanStatus = await this.registryContract.loanStatus(this.loanId);
      const loanDetails = await this.registryContract.loanDetails(this.loanId);
      const loanPayments = await this.registryContract.personalLoanPayments(
        this.loanId
      );
      const daoApprovalRequest = await this.governanceContract.approvalRequests(
        this.approvalRequest
      );

      // Correct Status.
      expect(loanStatus.toString()).to.be.equal(LoanStatus.REQUESTED);

      // Correct Event.
      expectEvent(tx.receipt, 'PersonalLoanRequested', {
        loanId: this.loanId,
        user: this.seeker,
        amount: amountRequested.toString(),
      });

      // Correct Details.
      expect(loanDetails.loanId.toString()).to.be.equal(this.loanId.toString());
      expect(loanDetails.loanType.toString()).to.be.equal(LoanType.PERSONAL);
      expect(loanDetails.startingDate.toString()).to.be.equal('0');
      expect(loanDetails.collateralToken.toString()).to.be.equal(
        this.collateralTokenContract.address
      );
      expect(loanDetails.collateralAmount.toString()).to.be.equal(
        amountCollateralized.toString()
      );
      expect(loanDetails.lendingAmount.toString()).to.be.equal(
        amountRequested.toString()
      );
      expect(loanDetails.totalPartitions).to.be.equal(totalPartitions);
      expect(loanDetails.totalInterest).to.be.equal(totalInterest);
      expect(loanDetails.extraInfo).to.be.equal(ipfsHash);
      expect(loanDetails.partitionsPurchased).to.be.equal(BigNumber.from(0));

      // Correct Payments.
      expect(loanPayments.batchesPaid.toString()).to.be.equal('0');
      expect(loanPayments.amountEachBatch.toString()).to.be.equal(
        amountEachBatch.toString()
      );
      expect(loanPayments.totalAmountOfBatches.toString()).to.be.equal(
        totalAmountOfBatches.toString()
      );
      expect(loanPayments.timeIntervalBetweenBatches.toString()).to.be.equal(
        batchTimeInterval.toString()
      );
      expect(loanPayments.batchesSkipped.toString()).to.be.equal('0');
      expect(loanPayments.batchStartingTimestamp.toString()).to.be.equal('0');
      expect(loanPayments.batchDeadlineTimestamp.toString()).to.be.equal('0');
      expect(loanPayments.repaymentBatchType.toString()).to.be.equal(
        RepaymentBatchType.INTEREST_PLUS_NOMINAL
      );

      // Correct Balances.
      expect(
        initSeekerCollateralBalance.sub(newSeekerCollateralBalance).toString()
      ).to.be.equal(amountCollateralized.toString());
      expect(
        newEscrowCollateralBalance.sub(initEscrowCollateralBalance).toString()
      ).to.be.equal(amountCollateralized.toString());
      expect(
        newEscrowFundingNftBalance.sub(initEscrowFundingNftBalance).toString()
      ).to.be.equal(totalPartitions.toString());

      // Correct Nft Behavior.
      expect(isPaused).to.be.equal(true);

      // Correct Dao Request.
      expect(daoApprovalRequest.loanId.toString()).to.be.equal(
        this.loanId.toString()
      );
      expect(daoApprovalRequest.isMilestone).to.be.equal(false);
      expect(daoApprovalRequest.milestoneNumber.toString()).to.be.equal('0');
      expect(daoApprovalRequest.deadlineTimestamp.toString()).to.be.equal(
        (await getTransactionTimestamp(tx.tx))
          .add(BigNumber.from(DAO_LOAN_APPROVAL))
          .toString()
      );
      expect(daoApprovalRequest.approvalsProvided.toString()).to.be.equal('0');
      expect(daoApprovalRequest.isApproved).to.be.equal(false);
    });
  });
}
