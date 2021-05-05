import BN from "bn.js";
import { toWei } from "web3-utils";
import { expect } from "chai";
import { LoanStatus } from "../../helpers/registryEnums";
import { ONE_DAY, BASE_AMOUNT } from "../../helpers/constants";
import { getCurrentTimestamp } from "../../helpers/time";

export default async function suite() {
  describe("Succeeds", async () => {
    let loanId: BN;
    let approvalRequest: BN;

    beforeEach(async function() {
      loanId = new BN(await this.registry.totalLoans());
      approvalRequest = new BN(await this.governance.totalApprovalRequests());

      const amountCollateralized = new BN(toWei("100000"));
      const interestPercentage = new BN(20);
      const totalMilestones = new BN(3);
      const timeDiffBetweenDeliveryAndRepayment = new BN(3600);
      const ipfsHash = "QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ";

      let milestoneDurations = new Array<BN>(totalMilestones);
      let amountRequestedPerMilestone = new Array<BN>(totalMilestones);
      const currentTime = await getCurrentTimestamp();

      for (let i = 0; i < Number(totalMilestones); i++) {
        milestoneDurations[i] = currentTime.add(new BN((i + 1) * ONE_DAY));
        amountRequestedPerMilestone[i] = new BN(toWei("10000"));
      }

      await this.registry.requestProjectLoan(
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

      const totalAmountRequested = amountRequestedPerMilestone[0].mul(
        totalMilestones
      );
      const totalPartitions = totalAmountRequested.div(
        new BN(toWei(BASE_AMOUNT.toString()))
      );
      const bigPartition = totalPartitions.div(new BN(2));

      await this.governance.superVoteForRequest(approvalRequest, true, {
        from: this.owner
      });

      await this.registry.fundLoan(loanId, bigPartition, {
        from: this.lenders[0]
      });
      await this.registry.fundLoan(loanId, bigPartition, {
        from: this.lenders[1]
      });

      approvalRequest = new BN(await this.governance.totalApprovalRequests());
      await this.registry.applyMilestone(loanId, { from: this.projectOwner });
    });
    it("when approving a milestone for a project loan", async function() {
      const initBorrowerLendingBalance = new BN(
        await this.lendingToken.balanceOf(this.projectOwner)
      );
      const initEscrowLendingBalance = new BN(
        await this.lendingToken.balanceOf(this.escrow.address)
      );

      await this.governance.superVoteForRequest(approvalRequest, true, {
        from: this.owner
      });

      const newBorrowerLendingBalance = new BN(
        await this.lendingToken.balanceOf(this.projectOwner)
      );
      const newEscrowLendingBalance = new BN(
        await this.lendingToken.balanceOf(this.escrow.address)
      );

      const currentTime = await getCurrentTimestamp();

      const loanPayments = await this.registry.projectLoanPayments(loanId);
      const daoApprovalRequest = await this.governance.approvalRequests(
        approvalRequest
      );
      const isPaused = await this.loanNft.transfersPaused(loanId);
      let loanStatus = await this.registry.loanStatus(loanId);

      const { amount } = await this.registry.getMilestonesInfo(loanId, 0);
      const { timestamp } = await this.registry.getMilestonesInfo(loanId, 1);

      // Correct Balances.
      expect(newBorrowerLendingBalance).to.be.bignumber.equal(
        initBorrowerLendingBalance.add(amount)
      );
      expect(newEscrowLendingBalance).to.be.bignumber.equal(
        initEscrowLendingBalance.sub(amount)
      );

      // Correct Status
      expect(loanStatus).to.be.bignumber.equal(
        LoanStatus.AWAITING_MILESTONE_APPLICATION
      );

      // Correct Dao Request.
      expect(daoApprovalRequest.loanId).to.be.bignumber.equal(loanId);
      expect(daoApprovalRequest.isMilestone).to.be.equal(true);
      expect(daoApprovalRequest.isApproved).to.be.equal(true);
      expect(daoApprovalRequest.milestoneNumber).to.be.bignumber.equal(
        new BN(0)
      );

      // Correct Payments.
      expect(
        loanPayments.currentMilestoneStartingTimestamp
      ).to.be.bignumber.equal(new BN(currentTime));
      expect(
        loanPayments.currentMilestoneDeadlineTimestamp
      ).to.be.bignumber.equal(new BN(currentTime).add(new BN(timestamp)));
      expect(loanPayments.milestonesDelivered).to.be.bignumber.equal(new BN(1));
      expect(loanPayments.milestonesExtended).to.be.bignumber.equal(new BN(0));

      // Correct Nft Behavior.
      expect(isPaused).to.be.equal(false);
    });
  });
}
