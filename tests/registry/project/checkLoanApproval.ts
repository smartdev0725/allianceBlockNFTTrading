import BN from 'bn.js';
import { toWei } from 'web3-utils';
import { expect } from 'chai';
import { LoanStatus } from '../../helpers/registryEnums';
import { ONE_DAY } from "../../helpers/constants";
import { getCurrentTimestamp } from "../../helpers/time";

export default async function suite() {
  describe('Succeeds', async () => {
    let loanId: BN;
    let approvalRequest: BN;

    beforeEach(async function () {
      loanId = new BN(await this.registry.totalLoans());
      approvalRequest = new BN(await this.governance.totalApprovalRequests());

      const amountCollateralized = new BN(toWei('100000'));
      const projectTokenPrice = new BN("1");
      const interestPercentage = new BN(20);
      const discountPerMillion = new BN(400000);
      const totalMilestones = new BN(3);
      const paymentTimeInterval = new BN(3600);
      const ipfsHash = "QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ";

      let milestoneDurations = new Array<BN>(totalMilestones);
      let amountRequestedPerMilestone = new Array<BN>(totalMilestones);
      const currentTime = await getCurrentTimestamp();

      for (let i = 0; i < Number(totalMilestones); i++) {
        milestoneDurations[i] = currentTime.add(new BN((i + 1) * ONE_DAY))
        amountRequestedPerMilestone[i] = new BN(toWei('10000'));
      }

      const tx = await this.registry.requestProjectLoan(
        amountRequestedPerMilestone,
        this.projectToken.address,
        amountCollateralized.toString(),
        projectTokenPrice,
        interestPercentage,
        discountPerMillion,
        totalMilestones,
        milestoneDurations,
        paymentTimeInterval,
        ipfsHash,
        { from: this.projectOwner }
      );
    });

    it('when approving a project loan', async function () {
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
