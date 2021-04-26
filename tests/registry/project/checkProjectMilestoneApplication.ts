import BN from 'bn.js';
import { toWei } from 'web3-utils';
import { expect } from 'chai';
import {  LoanStatus } from '../../helpers/registryEnums';
import { ONE_DAY, BASE_AMOUNT, DAO_MILESTONE_APPROVAL } from "../../helpers/constants";
import { getCurrentTimestamp } from "../../helpers/time";
const { expectEvent } = require("@openzeppelin/test-helpers");

export default async function suite() {
  describe('Succeeds', async () => {
    let loanId: BN;
    let approvalRequest: BN;

    beforeEach(async function () {
      loanId = new BN(await this.registry.totalLoans());
      approvalRequest = new BN(await this.governance.totalApprovalRequests());

      const amountCollateralized = new BN(toWei('100000'));
      const interestPercentage = new BN(20);
      const totalMilestones = new BN(3);
      const paymentTimeInterval = new BN(3600);
      const ipfsHash = "QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ"

      let milestoneDurations = new Array<BN>(totalMilestones);
      let amountRequestedPerMilestone = new Array<BN>(totalMilestones);
      const currentTime = await getCurrentTimestamp();

      for (let i = 0; i < Number(totalMilestones); i++) {
        milestoneDurations[i] = currentTime.add(new BN((i+1) * ONE_DAY))
        amountRequestedPerMilestone[i] = new BN(toWei('10000'));  
      }

      await this.registry.requestProjectLoan(
        amountRequestedPerMilestone,
        this.projectToken.address,
        amountCollateralized.toString(),
        interestPercentage,
        totalMilestones,
        milestoneDurations,
        paymentTimeInterval,
        ipfsHash,
        { from: this.projectOwner }
      );

      const totalAmountRequested = amountRequestedPerMilestone[0].mul(totalMilestones);
      const totalPartitions = totalAmountRequested.div(new BN(toWei(BASE_AMOUNT.toString())));
      const bigPartition = totalPartitions.div(new BN(2));

      await this.governance.voteForRequest(approvalRequest, true, { from: this.delegators[0] });
      await this.governance.voteForRequest(approvalRequest, true, { from: this.delegators[1] });

      await this.registry.fundLoan(loanId, bigPartition, { from: this.lenders[0] });
      await this.registry.fundLoan(loanId, bigPartition, { from: this.lenders[1] });
    });
    it("when applying a milestone to a project loan", async function () {

      approvalRequest = new BN(await this.governance.totalApprovalRequests());
      
      // Correct Initial Status.
      let loanStatus = await this.registry.loanStatus(loanId);
      expect(loanStatus).to.be.bignumber.equal(LoanStatus.STARTED);
      
      // Milestone Application By Project Owner
      const tx = await this.registry.applyMilestone(loanId, { from: this.projectOwner });
      
      const currentTime = await getCurrentTimestamp();

      const loanPayments = await this.registry.projectLoanPayments(loanId);
      const daoApprovalRequest = await this.governance.approvalRequests(approvalRequest);
      const isPaused = await this.loanNft.transfersPaused(loanId);
      loanStatus = await this.registry.loanStatus(loanId);
      
      // Correct Status
      expect(loanStatus).to.be.bignumber.equal(LoanStatus.AWAITING_MILESTONE_APPROVAL);

      // Correct Event.
      expectEvent(tx.receipt, 'ProjectLoanMilestoneApprovalRequested', { loanId , milestoneNumber: new BN(0).toString() });

      // Correct Dao Request.
      expect(daoApprovalRequest.isMilestone).to.be.true;
      expect(daoApprovalRequest.loanId).to.be.bignumber.equal(loanId);
      expect(daoApprovalRequest.approvalsProvided).to.be.bignumber.equal(new BN(0));
      expect(daoApprovalRequest.milestoneNumber).to.be.bignumber.equal(new BN(0));
      expect(daoApprovalRequest.deadlineTimestamp).to.be.bignumber.equal(new BN(currentTime).add(new BN(DAO_MILESTONE_APPROVAL)));
      expect(daoApprovalRequest.isApproved).to.be.equal(false);

      // Correct Payments.
      expect(loanPayments.milestonesDelivered).to.be.bignumber.equal(new BN(0));
      expect(loanPayments.milestonesExtended).to.be.bignumber.equal(new BN(0));

      // Correct Nft Behavior.
      expect(isPaused).to.be.equal(false);
    });
  });
}

