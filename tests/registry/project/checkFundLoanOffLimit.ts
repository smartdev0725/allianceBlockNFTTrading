import BN from "bn.js";
import { toWei } from "web3-utils";
import { ONE_DAY } from "../../helpers/constants";
import { getCurrentTimestamp } from "../../helpers/time";
const { time, expectRevert } = require("@openzeppelin/test-helpers");

export default async function suite() {
  describe("Succeeds", async () => {
    it("when funding a project loan off the limit should revert", async function () {
      // Given

      const loanId = new BN(await this.registry.totalLoans());
      const approvalRequest = new BN(
        await this.governance.totalApprovalRequests()
      );
      const smallPartition = new BN(25);

      const amountCollateralized = new BN(toWei("100000"));
      const interestPercentage = new BN(20);
      const discountPerMillion = new BN(300000);
      const totalMilestones = new BN(3);
      const paymentTimeInterval = new BN(3600);
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

      await this.governance.voteForRequest(approvalRequest, true, {
        from: this.delegators[0]
      });
      await this.governance.voteForRequest(approvalRequest, true, {
        from: this.delegators[1]
      });

      // When
      time.increase(30 * 24 * 60 * 60); // One Month

      // Then
      await expectRevert(
        this.registry.fundLoan(loanId, smallPartition, {
          from: this.lenders[0]
        }),
        "Only between funding timeframe"
      );
    });
  });
}
