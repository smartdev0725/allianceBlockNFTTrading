import {expect} from 'chai';
import {LoanStatus} from '../../helpers/registryEnums';
import {deployments, ethers, getNamedAccounts} from 'hardhat';
import {BigNumber} from 'ethers';

export default async function suite() {
  describe('Check project loan approval', async () => {
    it('when approving a project loan', async function () {
      let daoApprovalRequest = await this.governanceContract.approvalRequests(
        this.approvalRequest
      );

      // Correct Dao Request.
      expect(daoApprovalRequest.loanId.toString()).to.be.equal(
        this.loanId.toString()
      );
      expect(daoApprovalRequest.isMilestone).to.be.equal(false);
      expect(daoApprovalRequest.approvalsProvided.toString()).to.be.equal(
        BigNumber.from(1).toString()
      );
      expect(daoApprovalRequest.isApproved).to.be.equal(true);

      const isPaused = await this.fundingNFTContract.transfersPaused(
        this.loanId.toString()
      );
      const loanStatus = await this.registryContract.loanStatus(
        this.loanId.toString()
      );

      // Correct Nft Behavior.
      expect(isPaused).to.be.equal(false);

      // Correct Loan Status.
      expect(loanStatus.toString()).to.be.equal(LoanStatus.APPROVED);
    });
  });
}
