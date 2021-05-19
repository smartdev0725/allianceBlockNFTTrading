import BN from "bn.js";
import { expect } from "chai";
import { ONE_DAY } from "../helpers/constants";
import { increaseTime } from "../helpers/time";
import {ethers} from "hardhat";
import {BigNumber} from 'ethers';

export default async function suite() {
  describe("Succeeds", async () => {
    let loanId: BN;

    beforeEach(async function() {
      await this.stakingContract.connect(this.rewardDistributorSigner).notifyRewardAmount(BigNumber.from(0));
    });

    it("when staking tokens and getting rewards", async function() {
      // Given
      await this.stakingContract.connect(this.staker1Signer).stake();

      const rewardAmount = ethers.utils.parseEther('1000');

      await this.stakingContract.connect(this.rewardDistributorSigner).notifyRewardAmount(rewardAmount.toString());

      // When
      // Fast forward one day
      await increaseTime(this.staker1Signer.provider, ONE_DAY);

      const initialEarnedBal = await this.stakingContract.earned(this.staker1);
      await this.stakingContract.connect(this.staker1Signer).getReward();
      const postEarnedBal = await this.stakingContract.earned(this.staker1);

      // Then
      expect(initialEarnedBal.toString()).to.be.greaterThan(postEarnedBal.toString());
    });

    it("staking increases staking balance", async function() {
      // Given
      const staker2BalanceBefore = await this.stakingContract.getBalance(this.staker2);

      // When
      await this.stakingContract.connect(this.staker2Signer).stake();

      const staker2BalanceAfter = await this.stakingContract.getBalance(this.staker2);

      // Then
      expect(staker2BalanceAfter.toNumber()).to.be.greaterThan(
        staker2BalanceBefore.toNumber()
      );
    });
  });
}
