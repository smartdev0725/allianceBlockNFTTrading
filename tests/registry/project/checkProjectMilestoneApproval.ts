import {expect} from 'chai';
import {LoanStatus} from '../../helpers/registryEnums';
import {getCurrentTimestamp, getTransactionTimestamp} from '../../helpers/time';
import {deployments, ethers, getNamedAccounts} from 'hardhat';

export default async function suite() {
  describe('Project milestone approval', async () => {
    beforeEach(async function () {
      await this.registryContract
        .connect(this.lender1Signer)
        .fundLoan(this.loanId, this.bigPartition);
      await this.registryContract
        .connect(this.lender2Signer)
        .fundLoan(this.loanId, this.bigPartition);

      this.approvalRequest =
        await this.governanceContract.totalApprovalRequests();

      await this.registryContract
        .connect(this.seekerSigner)
        .applyMilestone(this.loanId);
    });

    it('when approving a milestone for a project loan', async function () {
      const initSeekerLendingBalance =
        await this.lendingTokenContract.balanceOf(this.seeker);
      const initEscrowLendingBalance =
        await this.lendingTokenContract.balanceOf(this.escrowContract.address);

      await this.governanceContract
        .connect(this.superDelegatorSigner)
        .superVoteForRequest(this.approvalRequest, true);

      const newSeekerLendingBalance = await this.lendingTokenContract.balanceOf(
        this.seeker
      );
      const newEscrowLendingBalance = await this.lendingTokenContract.balanceOf(
        this.escrowContract.address
      );

      const currentTime = await getCurrentTimestamp();

      const loanPayments = await this.registryContract.projectLoanPayments(
        this.loanId
      );
      const daoApprovalRequest = await this.governanceContract.approvalRequests(
        this.approvalRequest
      );
      const isPaused = await this.fundingNFTContract.transfersPaused(
        this.loanId
      );
      const loanStatus = await this.registryContract.loanStatus(this.loanId);

      const {amount} = await this.registryContract.getMilestonesInfo(
        this.loanId,
        0
      );
      const {timestamp} = await this.registryContract.getMilestonesInfo(
        this.loanId,
        1
      );

      // Correct Balances.
      expect(newSeekerLendingBalance.toString()).to.be.equal(
        initSeekerLendingBalance.add(amount).toString()
      );
      expect(newEscrowLendingBalance.toString()).to.be.equal(
        initEscrowLendingBalance.sub(amount).toString()
      );

      // Correct Status
      expect(loanStatus.toString()).to.be.equal(
        LoanStatus.AWAITING_MILESTONE_APPLICATION
      );

      // Correct Dao Request.
      expect(daoApprovalRequest.loanId.toNumber()).to.be.equal(
        this.loanId.toNumber()
      );
      expect(daoApprovalRequest.isMilestone).to.be.equal(true);
      expect(daoApprovalRequest.approvalsProvided.toNumber()).to.be.equal(1);
      expect(daoApprovalRequest.isApproved).to.be.equal(true);
      expect(daoApprovalRequest.milestoneNumber.toNumber()).to.be.equal(0);

      // Correct Payments.
      expect(loanPayments.milestonesDelivered.toNumber()).to.be.equal(1);
      expect(loanPayments.milestonesExtended.toNumber()).to.be.equal(0);

      // Correct Nft Behavior.
      expect(isPaused).to.be.equal(false);
    });
  });
}
