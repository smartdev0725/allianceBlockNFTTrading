import { expect } from 'chai';
import { LoanStatus } from '../../helpers/registryEnums';
import { deployments, getNamedAccounts, ethers } from 'hardhat';

export default async function suite() {
  describe('Personal loan approval', async () => {
    it('when approving a loan', async function () {
      const approvalRequest =
        await this.governanceContract.totalApprovalRequests();

      await this.governanceContract
        .connect(this.superDelegatorSigner)
        .superVoteForRequest(approvalRequest, true);

      const loanStatus = await this.registryContract.loanStatus(this.loanId);

      let daoApprovalRequest = await this.governanceContract.approvalRequests(
        approvalRequest
      );

      // Correct Dao Request.
      expect(daoApprovalRequest.loanId.toString()).to.be.equal(
        this.loanId.toString()
      );
      expect(daoApprovalRequest.isMilestone).to.be.equal(false);
      expect(daoApprovalRequest.approvalsProvided.toString()).to.be.equal('1');
      expect(daoApprovalRequest.isApproved).to.be.equal(true);

      const isPaused = await this.fundingNFTContract.transfersPaused(this.loanId);

      // Correct Nft Behavior.
      expect(isPaused).to.be.equal(false);

      // Correct Loan Status.
      expect(loanStatus.toString()).to.be.equal(LoanStatus.APPROVED);
    });
  });
}
