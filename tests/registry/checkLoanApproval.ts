import BN from 'bn.js';
import { toWei } from 'web3-utils';
import { expect } from 'chai';
import { RepaymentBatchType, LoanType, LoanStatus } from '../helpers/registryEnums';
import { ONE_DAY, BASE_AMOUNT, DAO_LOAN_APPROVAL } from "../helpers/constants";
import { getTransactionTimestamp } from "../helpers/time";

export default async function suite() {
  describe('Succeeds', async () => {
    let loanId: BN;
    let approvalRequest: BN;

    beforeEach(async function () {
      loanId = new BN(await this.registry.totalLoans());
      approvalRequest = new BN(await this.governance.totalApprovalRequests());

      const amountRequested = new BN(toWei('10000'));
      const amountCollateralized = new BN(toWei('20000'));
      const totalAmountOfBatches = new BN(2);
      const interestPercentage = new BN(20);
      const batchTimeInterval = new BN(20 * ONE_DAY);
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
    });

    it('when approving a loan', async function () {
      await this.governance.voteForRequest(approvalRequest, true, { from: this.delegators[0] });

      let daoApprovalRequest = await this.governance.approvalRequests(approvalRequest);
      let hasVotedForRequest = await this.governance.hasVotedForRequestId(this.delegators[0], approvalRequest);

      // Correct Dao Request.
      expect(daoApprovalRequest.loanId).to.be.bignumber.equal(loanId);
      expect(daoApprovalRequest.isMilestone).to.be.equal(false);
      expect(daoApprovalRequest.approvalsProvided).to.be.bignumber.equal(new BN(1));
      expect(daoApprovalRequest.isApproved).to.be.equal(false);

      // Correct voting status for delegator.
      expect(hasVotedForRequest).to.be.equal(true);

      await this.governance.voteForRequest(approvalRequest, true, { from: this.delegators[1] });

      daoApprovalRequest = await this.governance.approvalRequests(approvalRequest);
      hasVotedForRequest = await this.governance.hasVotedForRequestId(this.delegators[1], approvalRequest);

      const isPaused = await this.loanNft.transfersPaused(loanId);
      const loanStatus = await this.registry.loanStatus(loanId);

      // Correct Dao Request.
      expect(daoApprovalRequest.approvalsProvided).to.be.bignumber.equal(new BN(2));
      expect(daoApprovalRequest.isApproved).to.be.equal(true);

      // Correct voting status for delegator.
      expect(hasVotedForRequest).to.be.equal(true);

      // Correct Nft Behavior.
      expect(isPaused).to.be.equal(false);

      // Correct Loan Status.
      expect(loanStatus).to.be.bignumber.equal(LoanStatus.APPROVED);
    });
  });
}
