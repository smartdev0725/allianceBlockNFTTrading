import BN from 'bn.js';
import { toWei } from 'web3-utils';
import { expect } from 'chai';
import { RepaymentBatchType, LoanType, LoanStatus } from '../helpers/registryEnums';
import { ONE_DAY, BASE_AMOUNT, DAO_LOAN_APPROVAL } from "../helpers/constants";
import { getTransactionTimestamp, getCurrentTimestamp } from "../helpers/time";

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
      initBorrowerCollateralBalance = new BN(await this.projectToken.balanceOf(this.projectOwner));
      initEscrowCollateralBalance = new BN(await this.projectToken.balanceOf(this.escrow.address));
      initEscrowLoanNftBalance =  new BN(await this.loanNft.balanceOf(this.escrow.address, loanId));
    });

    it('when requesting an interest only personal loan', async function () {
      const amountCollateralized = new BN(toWei('100000'));
      const interestPercentage = new BN(20);
      const totalMilestones = new BN(3);
      const timeDiffBetweenDeliveryAndRepayment = new BN(3600);
      const ipfsHash = "QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ"

      // let milestoneDurations:BN[] = [];
      let milestoneDurations = new Array<BN>(totalMilestones);
      let amountRequestedPerMilestone = new Array<BN>(totalMilestones);
      const currentTime = await getCurrentTimestamp();

      for (let i = 0; i < Number(totalMilestones); i++) {
        milestoneDurations[i] = currentTime.add(new BN((i+1) * ONE_DAY))
        amountRequestedPerMilestone[i] = new BN(toWei('10000'));  
      }

      const tx = await this.registry.requestProjectLoan(
        amountRequestedPerMilestone,
        this.projectToken.address,
        amountCollateralized.toString(),
        interestPercentage,
        totalMilestones,
        milestoneDurations,
        timeDiffBetweenDeliveryAndRepayment,
        ipfsHash,
        { from: this.projectOwner }
      );

      const totalAmountRequested = amountRequestedPerMilestone[0].mul(totalMilestones);
      const totalPartitions = totalAmountRequested.div(new BN(toWei(BASE_AMOUNT.toString())));
      const totalInterest = totalAmountRequested.mul(interestPercentage).div(new BN(100));

      const newBorrowerCollateralBalance = new BN(await this.projectToken.balanceOf(this.projectOwner));
      const newEscrowCollateralBalance = new BN(await this.projectToken.balanceOf(this.escrow.address));
      const newEscrowLoanNftBalance =  new BN(await this.loanNft.balanceOf(this.escrow.address, loanId));

      const isPaused = await this.loanNft.transfersPaused(loanId);

      const loanStatus = await this.registry.loanStatus(loanId);
      const loanDetails = await this.registry.loanDetails(loanId);
      const loanPayments = await this.registry.projectLoanPayments(loanId);
      const daoApprovalRequest = await this.governance.approvalRequests(approvalRequest);

      // Correct Status.
      expect(loanStatus).to.be.bignumber.equal(LoanStatus.REQUESTED);

      // Correct Details.
      expect(loanDetails.loanId).to.be.bignumber.equal(loanId);
      expect(loanDetails.loanType).to.be.bignumber.equal(LoanType.PROJECT);
      expect(loanDetails.startingDate).to.be.bignumber.equal(new BN(0));
      expect(loanDetails.collateralToken).to.be.equal(this.projectToken.address);
      expect(loanDetails.collateralAmount).to.be.bignumber.equal(amountCollateralized);
      expect(loanDetails.lendingAmount).to.be.bignumber.equal(totalAmountRequested);
      expect(loanDetails.totalPartitions).to.be.bignumber.equal(totalPartitions);
      expect(loanDetails.totalInterest).to.be.bignumber.equal(totalInterest);
      expect(loanDetails.extraInfo).to.be.equal(ipfsHash);
      expect(loanDetails.partitionsPurchased).to.be.bignumber.equal(new BN(0));

      // Correct Payments.
      expect(loanPayments.totalMilestones).to.be.bignumber.equal(totalMilestones);
      expect(loanPayments.milestonesDelivered).to.be.bignumber.equal(new BN(0));
      expect(loanPayments.milestonesExtended).to.be.bignumber.equal(new BN(0));
      expect(loanPayments.timeDiffBetweenDeliveryAndRepayment).to.be.bignumber.equal(timeDiffBetweenDeliveryAndRepayment);
      expect(loanPayments.currentMilestoneStartingTimestamp).to.be.bignumber.equal(new BN(0));
      expect(loanPayments.currentMilestoneDeadlineTimestamp).to.be.bignumber.equal(new BN(0));
      expect(loanPayments.amountToBeRepaid).to.be.bignumber.equal(totalAmountRequested.add(totalInterest));
      expect(loanPayments.discountPerMillion).to.be.bignumber.equal(new BN(0));
      for (const i in milestoneDurations) {
        const {amount, timestamp} = await this.registry.getMilestonesInfo(loanId, i);
        expect(amount).to.be.bignumber.equal(amountRequestedPerMilestone[i]);
        expect(timestamp).to.be.bignumber.equal(milestoneDurations[i]);
      }

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
