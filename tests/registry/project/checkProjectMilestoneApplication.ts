import chai, {expect} from 'chai';
import {LoanStatus} from '../../helpers/registryEnums';
import {BASE_AMOUNT, DAO_MILESTONE_APPROVAL} from '../../helpers/constants';
import {getCurrentTimestamp} from '../../helpers/time';
import {deployments, ethers, getNamedAccounts} from 'hardhat';
import {solidity} from 'ethereum-waffle';
import {BigNumber} from 'ethers';

chai.use(solidity);

export default async function suite() {
  describe('Project milestone application', async () => {
    beforeEach(async function () {
      const totalAmountRequested = this.amountRequestedPerMilestone[0].mul(
        this.totalMilestones
      );
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
      let approvalRequest =
        await this.governanceContract.totalApprovalRequests();

      // Correct Initial Status.
      let loanStatus = await this.registryContract.loanStatus(this.loanId);
      expect(loanStatus.toString()).to.be.equal(LoanStatus.STARTED);

      // Milestone Application by seeker and Correct Event.
      await expect(
        this.registryContract
          .connect(this.seekerSigner)
          .applyMilestone(this.loanId)
      )
        .to.emit(this.registryContract, 'ProjectLoanMilestoneApprovalRequested')
        .withArgs(this.loanId.toString(), '0');

      const currentTime = await getCurrentTimestamp();

      const loanPayments = await this.registryContract.projectLoanPayments(
        this.loanId
      );
      const daoApprovalRequest = await this.governanceContract.approvalRequests(
        approvalRequest
      );
      const isPaused = await this.fundingNFTContract.transfersPaused(
        this.loanId
      );
      loanStatus = await this.registryContract.loanStatus(this.loanId);

      // Correct Status
      expect(loanStatus.toString()).to.be.equal(
        LoanStatus.AWAITING_MILESTONE_APPROVAL
      );

      // Correct Dao Request.
      expect(daoApprovalRequest.isMilestone).to.be.true;
      expect(daoApprovalRequest.loanId.toNumber()).to.be.equal(
        this.loanId.toNumber()
      );

      expect(daoApprovalRequest.approvalsProvided.toNumber()).to.be.equal(0);
      expect(daoApprovalRequest.milestoneNumber.toNumber()).to.be.equal(0);

      expect(daoApprovalRequest.isApproved).to.be.equal(false);

      // Correct Payments.
      expect(loanPayments.milestonesDelivered.toNumber()).to.be.equal(0);
      expect(loanPayments.milestonesExtended.toNumber()).to.be.equal(0);

      // Correct Nft Behavior.
      expect(isPaused).to.be.equal(false);
    });
  });
}
