import BN from 'bn.js';
import { toWei } from 'web3-utils';
import { expect } from 'chai';
import { RepaymentBatchType, LoanType, LoanStatus } from '../helpers/registryEnums';
import { ONE_DAY, BASE_AMOUNT, DAO_LOAN_APPROVAL } from "../helpers/constants";
import { increaseTime } from "../helpers/time";

export default async function suite() {
  describe('Succeeds', async () => {
    let loanId: BN;

    beforeEach(async function () {
      await this.staking.notifyRewardAmount(new BN(0), { from: this.rewardDistributor });
    });

    it('when staking tokens and getting rewards', async function () {
      const stakeAmount = new BN(toWei('1000'));

      await this.staking.stake(stakeAmount.toString(), { from: this.stakers[0] });
      const rewardAmount = new BN(toWei('1000'));

      await this.staking.notifyRewardAmount(rewardAmount.toString(), { from: this.rewardDistributor });

      await increaseTime(new BN(ONE_DAY));

      const reward = await this.staking.rewardPerToken();

      expect(toWei(rewardAmount.div(stakeAmount))).to.be.bignumber.equal(new BN(Math.round(reward).toString()));

      await this.staking.stake(stakeAmount.toString(), { from: this.stakers[1] });

      await this.staking.notifyRewardAmount(rewardAmount.toString(), { from: this.rewardDistributor });

      await increaseTime(new BN(ONE_DAY));

      const earnedFirstStaker = await this.staking.earned(this.stakers[0]);
      const earnedSecondStaker = await this.staking.earned(this.stakers[1]);

      // Avoid scientific exponential numbers. (toLocaleString())
      expect(rewardAmount.mul(new BN(3)).div(new BN(2))).to.be.bignumber.equal(
        Math.round(earnedFirstStaker).toLocaleString('fullwide', {useGrouping:false}));
      expect(rewardAmount.div(new BN(2))).to.be.bignumber.equal(new BN(Math.round(earnedSecondStaker).toString()));
    });
  });
}
