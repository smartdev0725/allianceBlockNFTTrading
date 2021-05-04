import BN from "bn.js";
import { toWei } from "web3-utils";
import { expect } from "chai";
import { LoanStatus } from "../../helpers/registryEnums";
import { ONE_DAY, BASE_AMOUNT } from "../../helpers/constants";
import { getCurrentTimestamp } from "../../helpers/time";

const { time, expectRevert } = require("@openzeppelin/test-helpers");

export default async function suite() {
  describe("Succeeds", async () => {
    let loanId: BN;
    let approvalRequest: BN;

    beforeEach(async function () {
      // Given
      loanId = new BN(await this.registry.totalLoans());
      approvalRequest = new BN(await this.governance.totalApprovalRequests());

      const amountCollateralized = new BN(toWei("100000"));
      const interestPercentage = new BN(20);
      const discountPerMillion = new BN(400000);
      const totalMilestones = new BN(1);
      const paymentTimeInterval = new BN(20 * ONE_DAY);
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
        discountPerMillion,
        totalMilestones,
        milestoneDurations,
        paymentTimeInterval,
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

      await this.governance.voteForRequest(approvalRequest, true, {
        from: this.delegators[0]
      });
      await this.governance.voteForRequest(approvalRequest, true, {
        from: this.delegators[1]
      });

      await this.registry.fundLoan(loanId, bigPartition, {
        from: this.lenders[0]
      });
      await this.registry.fundLoan(loanId, bigPartition, {
        from: this.lenders[1]
      });

      approvalRequest = new BN(await this.governance.totalApprovalRequests());
      await this.registry.applyMilestone(loanId, { from: this.projectOwner });

      await this.governance.voteForRequest(approvalRequest, true, {
        from: this.delegators[0]
      });
      await this.governance.voteForRequest(approvalRequest, true, {
        from: this.delegators[1]
      });
    });

    it("when repaying a project loan", async function () {
      const loanPayments = await this.registry.projectLoanPayments(loanId);

      await this.lendingToken.approve(
        this.registry.address,
        await this.registry.getAmountToBeRepaid(loanId),
        {
          from: this.projectOwner
        }
      );
      await this.registry.executePayment(loanId, { from: this.projectOwner });
      const loanStatus = await this.registry.loanStatus(loanId);

      // Correct Status.
      expect(loanStatus).to.be.bignumber.equal(LoanStatus.SETTLED);
    });

    it("should revert in case it does not have allowancee", async function () {
      // When && Then
      await expectRevert(
        this.registry.executePayment(loanId, { from: this.projectOwner }),
        "transfer amount exceeds allowance"
      );
    });

    it("should revert when repaying a project loan out of time", async function () {
      // When
      const loanPayments = await this.registry.projectLoanPayments(loanId);

      // Move time to 1 month, so we can trigger the exception
      time.increase(30 * 24 * 60 * 60); // One Month

      await this.lendingToken.approve(
        this.registry.address,
        await this.registry.getAmountToBeRepaid(loanId),
        {
          from: this.projectOwner
        }
      );

      // Then
      await expectRevert(
        this.registry.executePayment(loanId, { from: this.projectOwner }),
        "Only between awaiting for repayment timeframe"
      );
    });
  });
}
