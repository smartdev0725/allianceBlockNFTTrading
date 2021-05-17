import BN from "bn.js";
import { toWei } from "web3-utils";
import { expect } from "chai";
import { ONE_DAY } from "../helpers/constants";
import { increaseTime } from "../helpers/time";

export default async function suite() {
  describe("Succeeds", async () => {
    let loanId: BN;

    beforeEach(async function() {
      await this.staking.notifyRewardAmount(new BN(0), {
        from: this.rewardDistributor
      });
    });

    it("when staking tokens and getting rewards", async function() {
      // Given
      const staker1 = this.stakers[0];
      await this.staking.stake({ from: staker1 });

      const rewardAmount = new BN(toWei("1000"));

      await this.staking.notifyRewardAmount(rewardAmount.toString(), {
        from: this.rewardDistributor
      });

      // When
      // Fast forward one day
      await increaseTime(new BN(ONE_DAY));

      const initialEarnedBal = await this.staking.earned(staker1);
      await this.staking.getReward({ from: staker1 });
      const postEarnedBal = await this.staking.earned(staker1);

      // Then
      expect(initialEarnedBal).to.be.bignumber.greaterThan(postEarnedBal);
    });

    it("staking increases staking balance", async function() {
      // Given
      const staker2 = this.stakers[1];
      const staker2BalanceBefore = await this.staking.getBalance(staker2);

      // When
      await this.staking.stake({ from: staker2 });

      const staker2BalanceAfter = await this.staking.getBalance(staker2);

      // Then
      expect(staker2BalanceAfter).to.be.bignumber.greaterThan(
        staker2BalanceBefore
      );
    });
  });
}
