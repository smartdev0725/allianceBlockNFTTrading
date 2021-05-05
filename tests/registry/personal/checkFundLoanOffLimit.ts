import BN from "bn.js";
import { toWei } from "web3-utils";
import { RepaymentBatchType } from "../../helpers/registryEnums";
import { ONE_DAY, BASE_AMOUNT } from "../../helpers/constants";
const { time, expectRevert } = require("@openzeppelin/test-helpers");

export default async function suite() {
  describe("Succeeds", async () => {
    it("when funding a personal loan off the limit should revert", async function() {
      // Given
      const loanId = new BN(await this.registry.totalLoans());
      const approvalRequest = new BN(
        await this.governance.totalApprovalRequests()
      );
      const totalPartitions = new BN(100);
      const smallPartition = new BN(25);
      const amountRequested = totalPartitions.mul(
        new BN(toWei(BASE_AMOUNT.toString()))
      );
      const amountCollateralized = new BN(toWei("20000"));
      const totalAmountOfBatches = new BN(2);
      const interestPercentage = new BN(20);
      const batchTimeInterval = new BN(20 * ONE_DAY);
      const ipfsHash = web3.utils.keccak256("0x01"); // Dummy hash for testing.

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

      await this.governance.superVoteForRequest(approvalRequest, true, {
        from: this.owner
      });

      // When
      time.increase(3 * 24 * 60 * 60); // Three days

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
