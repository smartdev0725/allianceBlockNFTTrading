import {expect} from 'chai';
import {LoanStatus} from '../../helpers/registryEnums';
import {
  BASE_AMOUNT,
  DAO_MILESTONE_APPROVAL,
} from '../../helpers/constants';
import {getCurrentTimestamp} from '../../helpers/time';
import {deployments, ethers, getNamedAccounts} from 'hardhat';
const {expectEvent} = require('@openzeppelin/test-helpers');
import {BigNumber} from 'ethers';

export default async function suite() {
  describe('Project milestone application', async () => {
    beforeEach(async function () {

      const totalAmountRequested =
        this.amountRequestedPerMilestone[0].mul(this.totalMilestones);
      const totalPartitions = totalAmountRequested.div(
        ethers.utils.parseEther(BASE_AMOUNT + '')
      );
      const bigPartition = totalPartitions.div(BigNumber.from(2));

      await this.registryContract
        .connect(this.lender1Signer)
        .fundLoan(this.loanId, bigPartition);
      await this.registryContract
        .connect(this.lender2Signer)
        .fundLoan(this.loanId, bigPartition);
    });

    it('when applying a milestone to a project loan', async function () {
      let approvalRequest = await this.governanceContract.totalApprovalRequests();

      // Correct Initial Status.
      let loanStatus = await this.registryContract.loanStatus(this.loanId);
      expect(loanStatus.toString()).to.be.equal(LoanStatus.STARTED);

      // Milestone Application By Project Owner
      const tx = await this.registryContract
        .connect(this.deployerSigner)
        .applyMilestone(this.loanId);

      const currentTime = await getCurrentTimestamp();

      const loanPayments = await this.registryContract.projectLoanPayments(this.loanId);
      const daoApprovalRequest = await this.governanceContract.approvalRequests(approvalRequest);
      const isPaused = await this.fundingNFTContract.transfersPaused(this.loanId);
      loanStatus = await this.registryContract.loanStatus(this.loanId);

      // Correct Status
      expect(loanStatus.toString()).to.be.equal(
        LoanStatus.AWAITING_MILESTONE_APPROVAL
      );

      // Correct Event.
      expectEvent(tx.receipt, 'ProjectLoanMilestoneApprovalRequested', {
        loanId: this.loanId,
        milestoneNumber: '0',
      });

      // Correct Dao Request.
      expect(daoApprovalRequest.isMilestone).to.be.true;
      expect(daoApprovalRequest.loanId.toNumber()).to.be.equal(this.loanId.toNumber());
      expect(daoApprovalRequest.approvalsProvided.toNumber()).to.be.equal(0);
      expect(daoApprovalRequest.milestoneNumber.toNumber()).to.be.equal(0);
      expect(daoApprovalRequest.deadlineTimestamp.toNumber()).to.be.equal(
        currentTime.add(BigNumber.from(DAO_MILESTONE_APPROVAL))
      );
      expect(daoApprovalRequest.isApproved).to.be.equal(false);

      // Correct Payments.
      expect(loanPayments.milestonesDelivered.toNumber()).to.be.equal(0);
      expect(loanPayments.milestonesExtended.toNumber()).to.be.equal(0);

      // Correct Nft Behavior.
      expect(isPaused).to.be.equal(false);
    });
  });
}
