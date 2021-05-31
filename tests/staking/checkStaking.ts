import { expect } from 'chai';
import { ONE_DAY } from '../helpers/constants';
import { increaseTime } from '../helpers/time';
import { ethers } from 'hardhat';
import { BigNumber } from 'ethers';
import { StakingType } from '../helpers/registryEnums';
const { expectRevert } = require('@openzeppelin/test-helpers');

export default async function suite() {
  describe.only('Succeeds', async () => {
    beforeEach(async function () {
      console.log("start before each", await this.stakingContract.getBalance(this.staker2));
      await this.stakingContract
        .connect(this.rewardDistributorSigner)
        .notifyRewardAmount(BigNumber.from(0));
      console.log("end before each", await this.stakingContract.getBalance(this.staker2));
    });

    it('when the reward distributor is correctly said', async function () {
      expect(await this.stakingContract.rewardDistribution()).to.be.equal(this.rewardDistributor);
    });

    it('when only reward distributor can notifyRewardAmount', async function () {
      await expectRevert(this.stakingContract.connect(this.staker1Signer).notifyRewardAmount(BigNumber.from(0)), "Caller is not reward distribution");
    });

    it('staking changes albt and staking balances accordingly', async function () {
      // Given
      const staker2StakingAmountBefore = await this.stakingContract.getBalance(
        this.staker2
      );
      const amountToStake = (await this.stakingContract.stakingTypeAmounts(StakingType.STAKER_LVL_1)).sub(staker2StakingAmountBefore);
      console.log("amountToStake", amountToStake);
      const staker2ALBTBalanceBefore = await this.ALBTContract.balanceOf(
        this.staker2
      );
      const stakingContractALBTBalanceBefore = await this.ALBTContract.balanceOf(this.stakingContract.address);
      const stakedSupplyBefore = await this.stakingContract.totalSupply();

      // When
      await expect(this.stakingContract
        .connect(this.staker2Signer)
        .stake(StakingType.STAKER_LVL_1)).to.emit(this.stakingContract, "Staked").withArgs(this.staker2, amountToStake);

      const staker2StakingAmounAfter = await this.stakingContract.getBalance(
        this.staker2
      );
      const stakedSupplyAfter = await this.stakingContract.totalSupply();
      const staker2ALBTBalanceAfter = await this.ALBTContract.balanceOf(
        this.staker2
      );
      const stakingContractALBTBalanceAfter = await this.ALBTContract.balanceOf(this.stakingContract.address);

      // Then
      expect(Number(staker2StakingAmounAfter)).to.be.greaterThan(Number(staker2StakingAmountBefore));
      expect(Number(staker2ALBTBalanceAfter)).to.be.equal(Number(staker2ALBTBalanceBefore.sub(amountToStake)));
      expect(Number(stakingContractALBTBalanceAfter)).to.be.equal(Number(stakingContractALBTBalanceBefore.add(amountToStake)));
      expect(Number(stakedSupplyAfter)).to.be.equal(Number(stakedSupplyBefore.add(amountToStake)));
    });

    it('reputation increases with increasing staking type', async function () {
      // Given
      const rALBTBalanceBefore = await this.rALBTContract.balanceOf(
        this.staker2
      );

      // When
      await this.stakingContract
        .connect(this.staker2Signer)
        .stake(StakingType.STAKER_LVL_2);

      const rALBTBalanceAfter = await this.rALBTContract.balanceOf(
        this.staker2
      );

      // Then
      expect(Number(rALBTBalanceAfter)).to.be.greaterThan(
        Number(rALBTBalanceBefore)
      );
    });

    it('cannot stake for same type again', async function () {
      // Given
      await this.stakingContract
        .connect(this.staker2Signer)
        .stake(StakingType.STAKER_LVL_1);

      // Then
      await expectRevert(this.stakingContract
        .connect(this.staker2Signer)
        .stake(StakingType.STAKER_LVL_1), "Cannot stake for same type again");
    });

    it('staking for DAO Delegator level should revert', async function () {
      expectRevert(this.stakingContract
        .connect(this.staker2Signer)
        .stake(StakingType.DAO_DELEGATOR), "Delegator type stake only via Governance");
    });

    it('when staking tokens and getting rewards', async function () {
      // Given
      await this.stakingContract
        .connect(this.staker1Signer)
        .stake(StakingType.STAKER_LVL_1);

      const rewardAmount = ethers.utils.parseEther('1000');

      await this.stakingContract
        .connect(this.rewardDistributorSigner)
        .notifyRewardAmount(rewardAmount);

      // When
      // Fast forward one day
      await increaseTime(this.staker1Signer.provider, ONE_DAY);

      const initialEarnedBal = await this.stakingContract.earned(this.staker1);
      await this.stakingContract.connect(this.staker1Signer).getReward();
      const postEarnedBal = await this.stakingContract.earned(this.staker1);

      // Then
      expect(initialEarnedBal.toNumber()).to.be.greaterThan(
        postEarnedBal.toNumber()
      );
    });
  });
}
