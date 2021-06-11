import {expect} from 'chai';
import {ONE_DAY} from '../helpers/constants';
import {increaseTime} from '../helpers/time';
import {ethers} from 'hardhat';
import {BigNumber} from 'ethers';
import {StakingType} from '../helpers/registryEnums';
const {expectRevert} = require('@openzeppelin/test-helpers');

export default async function suite() {
  describe('Succeeds', async () => {
    beforeEach(async function () {
      await this.stakingContract
        .connect(this.rewardDistributorSigner)
        .notifyRewardAmount(BigNumber.from(0));
    });

    it('when the reward distributor is correctly set', async function () {
      expect(await this.stakingContract.rewardDistribution()).to.be.equal(
        this.rewardDistributor
      );
    });

    it('when only reward distributor can notifyRewardAmount', async function () {
      await expectRevert(
        this.stakingContract
          .connect(this.staker1Signer)
          .notifyRewardAmount(BigNumber.from(0)),
        'Caller is not reward distribution'
      );
    });

    it('when staking for level 1, ALBT, rALBT and staking balances are updated accordingly', async function () {
      // Given
      const staker1StakingAmountBefore = await this.stakingContract.getBalance(
        this.staker1
      );
      const amountToStake = (
        await this.stakingContract.stakingTypeAmounts(StakingType.STAKER_LVL_1)
      ).sub(staker1StakingAmountBefore);
      const staker1ALBTBalanceBefore = await this.ALBTContract.balanceOf(
        this.staker1
      );
      const stakingContractALBTBalanceBefore =
        await this.ALBTContract.balanceOf(this.stakingContract.address);
      const stakedSupplyBefore = await this.stakingContract.totalSupply();
      const rALBTBalanceBefore = await this.rALBTContract.balanceOf(
        this.staker1
      );

      // When
      await expect(
        this.stakingContract
          .connect(this.staker1Signer)
          .stake(StakingType.STAKER_LVL_1)
      )
        .to.emit(this.stakingContract, 'Staked')
        .withArgs(this.staker1, amountToStake);

      const staker1StakingAmounAfter = await this.stakingContract.getBalance(
        this.staker1
      );
      const stakedSupplyAfter = await this.stakingContract.totalSupply();
      const staker1ALBTBalanceAfter = await this.ALBTContract.balanceOf(
        this.staker1
      );
      const stakingContractALBTBalanceAfter = await this.ALBTContract.balanceOf(
        this.stakingContract.address
      );
      const rALBTBalanceAfter = await this.rALBTContract.balanceOf(
        this.staker1
      );

      // Then
      expect(Number(staker1StakingAmounAfter)).to.be.greaterThan(
        Number(staker1StakingAmountBefore)
      );
      expect(Number(staker1ALBTBalanceAfter)).to.be.equal(
        Number(staker1ALBTBalanceBefore.sub(amountToStake))
      );
      expect(Number(stakingContractALBTBalanceAfter)).to.be.equal(
        Number(stakingContractALBTBalanceBefore.add(amountToStake))
      );
      expect(Number(stakedSupplyAfter)).to.be.equal(
        Number(stakedSupplyBefore.add(amountToStake))
      );
      expect(Number(rALBTBalanceAfter)).to.be.greaterThan(
        Number(rALBTBalanceBefore)
      );
    });

    it('when staking for level 2, ALBT, rALBT and staking balances are updated accordingly', async function () {
      // Given
      const staker1StakingAmountBefore = await this.stakingContract.getBalance(
        this.staker1
      );
      const amountToStake = (
        await this.stakingContract.stakingTypeAmounts(StakingType.STAKER_LVL_2)
      ).sub(staker1StakingAmountBefore);
      const staker1ALBTBalanceBefore = await this.ALBTContract.balanceOf(
        this.staker1
      );
      const stakingContractALBTBalanceBefore =
        await this.ALBTContract.balanceOf(this.stakingContract.address);
      const stakedSupplyBefore = await this.stakingContract.totalSupply();
      const rALBTBalanceBefore = await this.rALBTContract.balanceOf(
        this.staker1
      );

      // When
      await expect(
        this.stakingContract
          .connect(this.staker1Signer)
          .stake(StakingType.STAKER_LVL_2)
      )
        .to.emit(this.stakingContract, 'Staked')
        .withArgs(this.staker1, amountToStake);

      const staker1StakingAmounAfter = await this.stakingContract.getBalance(
        this.staker1
      );
      const stakedSupplyAfter = await this.stakingContract.totalSupply();
      const staker1ALBTBalanceAfter = await this.ALBTContract.balanceOf(
        this.staker1
      );
      const stakingContractALBTBalanceAfter = await this.ALBTContract.balanceOf(
        this.stakingContract.address
      );
      const rALBTBalanceAfter = await this.rALBTContract.balanceOf(
        this.staker1
      );

      // Then
      expect(Number(staker1StakingAmounAfter)).to.be.greaterThan(
        Number(staker1StakingAmountBefore)
      );
      expect(Number(staker1ALBTBalanceAfter)).to.be.equal(
        Number(staker1ALBTBalanceBefore.sub(amountToStake))
      );
      expect(Number(stakingContractALBTBalanceAfter)).to.be.equal(
        Number(stakingContractALBTBalanceBefore.add(amountToStake))
      );
      expect(Number(stakedSupplyAfter)).to.be.equal(
        Number(stakedSupplyBefore.add(amountToStake))
      );
      expect(Number(rALBTBalanceAfter)).to.be.greaterThan(
        Number(rALBTBalanceBefore)
      );
    });

    it('when staking for level 3 or DAO member, ALBT, rALBT and staking balances are updated accordingly', async function () {
      // Given
      const staker1StakingAmountBefore = await this.stakingContract.getBalance(
        this.staker1
      );
      const amountToStake = (
        await this.stakingContract.stakingTypeAmounts(
          StakingType.STAKER_LVL_3_OR_DAO_MEMBER
        )
      ).sub(staker1StakingAmountBefore);
      const staker1ALBTBalanceBefore = await this.ALBTContract.balanceOf(
        this.staker1
      );
      const stakingContractALBTBalanceBefore =
        await this.ALBTContract.balanceOf(this.stakingContract.address);
      const stakedSupplyBefore = await this.stakingContract.totalSupply();
      const rALBTBalanceBefore = await this.rALBTContract.balanceOf(
        this.staker1
      );

      // When
      await expect(
        this.stakingContract
          .connect(this.staker1Signer)
          .stake(StakingType.STAKER_LVL_3_OR_DAO_MEMBER)
      )
        .to.emit(this.stakingContract, 'Staked')
        .withArgs(this.staker1, amountToStake);

      const staker1StakingAmounAfter = await this.stakingContract.getBalance(
        this.staker1
      );
      const stakedSupplyAfter = await this.stakingContract.totalSupply();
      const staker1ALBTBalanceAfter = await this.ALBTContract.balanceOf(
        this.staker1
      );
      const stakingContractALBTBalanceAfter = await this.ALBTContract.balanceOf(
        this.stakingContract.address
      );
      const rALBTBalanceAfter = await this.rALBTContract.balanceOf(
        this.staker1
      );

      // Then
      expect(Number(staker1StakingAmounAfter)).to.be.greaterThan(
        Number(staker1StakingAmountBefore)
      );
      expect(Number(staker1ALBTBalanceAfter)).to.be.equal(
        Number(staker1ALBTBalanceBefore.sub(amountToStake))
      );
      expect(Number(stakingContractALBTBalanceAfter)).to.be.equal(
        Number(stakingContractALBTBalanceBefore.add(amountToStake))
      );
      expect(Number(stakedSupplyAfter)).to.be.equal(
        Number(stakedSupplyBefore.add(amountToStake))
      );
      expect(Number(rALBTBalanceAfter)).to.be.greaterThan(
        Number(rALBTBalanceBefore)
      );
    });

    it('when cannot stake for same type again', async function () {
      // Given
      await this.stakingContract
        .connect(this.staker1Signer)
        .stake(StakingType.STAKER_LVL_1);

      // Then
      await expectRevert(
        this.stakingContract
          .connect(this.staker1Signer)
          .stake(StakingType.STAKER_LVL_1),
        'Cannot stake for same type again'
      );
    });

    it('when staking for DAO Delegator level reverts', async function () {
      expectRevert(
        this.stakingContract
          .connect(this.staker1Signer)
          .stake(StakingType.DAO_DELEGATOR),
        'Delegator type stake only via Governance'
      );
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

    it('when exiting/withdrawing from level 1 stake balances are updated accordingly', async function () {
      // Given
      await this.stakingContract
        .connect(this.staker1Signer)
        .stake(StakingType.STAKER_LVL_1);
      const staker1StakingAmountBefore = await this.stakingContract.getBalance(
        this.staker1
      );
      const staker1ALBTBalanceBefore = await this.ALBTContract.balanceOf(
        this.staker1
      );
      const stakingContractALBTBalanceBefore =
        await this.ALBTContract.balanceOf(this.stakingContract.address);
      const stakedSupplyBefore = await this.stakingContract.totalSupply();
      const rALBTBalanceBefore = await this.rALBTContract.balanceOf(
        this.staker1
      );

      // When
      await this.stakingContract.connect(this.staker1Signer).exit();

      const staker1StakingAmountAfter = await this.stakingContract.getBalance(
        this.staker1
      );
      const staker1ALBTBalanceAfter = await this.ALBTContract.balanceOf(
        this.staker1
      );
      const stakingContractALBTBalanceAfter = await this.ALBTContract.balanceOf(
        this.stakingContract.address
      );
      const stakedSupplyAfter = await this.stakingContract.totalSupply();
      const rALBTBalanceAfter = await this.rALBTContract.balanceOf(
        this.staker1
      );
      const rewardAfter = await this.stakingContract.earned(this.staker1);

      // Then
      expect(staker1StakingAmountAfter).to.be.equal(0);
      expect(staker1ALBTBalanceAfter).to.be.equal(
        staker1ALBTBalanceBefore.add(staker1StakingAmountBefore)
      );
      expect(stakingContractALBTBalanceAfter).to.be.equal(
        stakingContractALBTBalanceBefore.sub(staker1StakingAmountBefore)
      );
      expect(stakedSupplyAfter).to.be.equal(
        stakedSupplyBefore.sub(staker1StakingAmountBefore)
      );
      expect(Number(rALBTBalanceAfter)).to.be.lessThan(
        Number(rALBTBalanceBefore)
      );
      expect(rewardAfter).to.be.equal(Number(0));
    });

    it('when exiting/withdrawing from level 2 stake balances are updated accordingly', async function () {
      // Given
      await this.stakingContract
        .connect(this.staker1Signer)
        .stake(StakingType.STAKER_LVL_2);
      const staker1StakingAmountBefore = await this.stakingContract.getBalance(
        this.staker1
      );
      const staker1ALBTBalanceBefore = await this.ALBTContract.balanceOf(
        this.staker1
      );
      const stakingContractALBTBalanceBefore =
        await this.ALBTContract.balanceOf(this.stakingContract.address);
      const stakedSupplyBefore = await this.stakingContract.totalSupply();
      const rALBTBalanceBefore = await this.rALBTContract.balanceOf(
        this.staker1
      );

      // When
      await this.stakingContract.connect(this.staker1Signer).exit();

      const staker1StakingAmountAfter = await this.stakingContract.getBalance(
        this.staker1
      );
      const staker1ALBTBalanceAfter = await this.ALBTContract.balanceOf(
        this.staker1
      );
      const stakingContractALBTBalanceAfter = await this.ALBTContract.balanceOf(
        this.stakingContract.address
      );
      const stakedSupplyAfter = await this.stakingContract.totalSupply();
      const rALBTBalanceAfter = await this.rALBTContract.balanceOf(
        this.staker1
      );
      const rewardAfter = await this.stakingContract.earned(this.staker1);

      // Then
      expect(staker1StakingAmountAfter).to.be.equal(0);
      expect(staker1ALBTBalanceAfter).to.be.equal(
        staker1ALBTBalanceBefore.add(staker1StakingAmountBefore)
      );
      expect(stakingContractALBTBalanceAfter).to.be.equal(
        stakingContractALBTBalanceBefore.sub(staker1StakingAmountBefore)
      );
      expect(stakedSupplyAfter).to.be.equal(
        stakedSupplyBefore.sub(staker1StakingAmountBefore)
      );
      expect(Number(rALBTBalanceAfter)).to.be.lessThan(
        Number(rALBTBalanceBefore)
      );
      expect(rewardAfter).to.be.equal(Number(0));
    });

    it('when exiting/withdrawing from level 3 or dao member stake balances are updated accordingly', async function () {
      // Given
      await this.stakingContract
        .connect(this.staker1Signer)
        .stake(StakingType.STAKER_LVL_3_OR_DAO_MEMBER);
      const staker1StakingAmountBefore = await this.stakingContract.getBalance(
        this.staker1
      );
      const staker1ALBTBalanceBefore = await this.ALBTContract.balanceOf(
        this.staker1
      );
      const stakingContractALBTBalanceBefore =
        await this.ALBTContract.balanceOf(this.stakingContract.address);
      const stakedSupplyBefore = await this.stakingContract.totalSupply();
      const rALBTBalanceBefore = await this.rALBTContract.balanceOf(
        this.staker1
      );

      // When
      await this.stakingContract.connect(this.staker1Signer).exit();

      const staker1StakingAmountAfter = await this.stakingContract.getBalance(
        this.staker1
      );
      const staker1ALBTBalanceAfter = await this.ALBTContract.balanceOf(
        this.staker1
      );
      const stakingContractALBTBalanceAfter = await this.ALBTContract.balanceOf(
        this.stakingContract.address
      );
      const stakedSupplyAfter = await this.stakingContract.totalSupply();
      const rALBTBalanceAfter = await this.rALBTContract.balanceOf(
        this.staker1
      );
      const rewardAfter = await this.stakingContract.earned(this.staker1);

      // Then
      expect(staker1StakingAmountAfter).to.be.equal(0);
      expect(staker1ALBTBalanceAfter).to.be.equal(
        staker1ALBTBalanceBefore.add(staker1StakingAmountBefore)
      );
      expect(stakingContractALBTBalanceAfter).to.be.equal(
        stakingContractALBTBalanceBefore.sub(staker1StakingAmountBefore)
      );
      expect(stakedSupplyAfter).to.be.equal(
        stakedSupplyBefore.sub(staker1StakingAmountBefore)
      );
      expect(Number(rALBTBalanceAfter)).to.be.lessThan(
        Number(rALBTBalanceBefore)
      );
      expect(rewardAfter).to.be.equal(Number(0));
    });

    it('when unstaking can only drop to lower level', async function () {
      // Given
      await this.stakingContract
        .connect(this.staker1Signer)
        .stake(StakingType.STAKER_LVL_1);
      // Then
      expectRevert(
        this.stakingContract
          .connect(this.staker1Signer)
          .unstake(StakingType.STAKER_LVL_1),
        'Can only drop to lower level'
      );
      expectRevert(
        this.stakingContract
          .connect(this.staker1Signer)
          .unstake(StakingType.STAKER_LVL_2),
        'Can only drop to lower level'
      );
      expectRevert(
        this.stakingContract
          .connect(this.staker1Signer)
          .unstake(StakingType.STAKER_LVL_3_OR_DAO_MEMBER),
        'Can only drop to lower level'
      );

      // Given
      await this.stakingContract
        .connect(this.staker1Signer)
        .stake(StakingType.STAKER_LVL_2);
      // Then
      expectRevert(
        this.stakingContract
          .connect(this.staker1Signer)
          .unstake(StakingType.STAKER_LVL_2),
        'Can only drop to lower level'
      );
      expectRevert(
        this.stakingContract
          .connect(this.staker1Signer)
          .unstake(StakingType.STAKER_LVL_3_OR_DAO_MEMBER),
        'Can only drop to lower level'
      );
      // Given
      await this.stakingContract
        .connect(this.staker1Signer)
        .stake(StakingType.STAKER_LVL_3_OR_DAO_MEMBER);
      // Then
      expectRevert(
        this.stakingContract
          .connect(this.staker1Signer)
          .unstake(StakingType.STAKER_LVL_3_OR_DAO_MEMBER),
        'Can only drop to lower level'
      );
    });

    it('when unstaking from level 2 to level 1 stake balances are updated accordingly', async function () {
      // Given
      await this.stakingContract
        .connect(this.staker1Signer)
        .stake(StakingType.STAKER_LVL_2);
      const staker1StakingAmountBefore = await this.stakingContract.getBalance(
        this.staker1
      );
      const staker1ALBTBalanceBefore = await this.ALBTContract.balanceOf(
        this.staker1
      );
      const stakingContractALBTBalanceBefore =
        await this.ALBTContract.balanceOf(this.stakingContract.address);
      const stakedSupplyBefore = await this.stakingContract.totalSupply();
      const rALBTBalanceBefore = await this.rALBTContract.balanceOf(
        this.staker1
      );
      const amountToUnstake = staker1StakingAmountBefore.sub(
        await this.stakingContract.stakingTypeAmounts(StakingType.STAKER_LVL_1)
      );
      const totalAmountFromStakingToStaker = amountToUnstake.add(
        await this.stakingContract.earned(this.staker1)
      );

      // When
      await expect(
        this.stakingContract
          .connect(this.staker1Signer)
          .unstake(StakingType.STAKER_LVL_1)
      )
        .to.emit(this.stakingContract, 'Withdrawn')
        .withArgs(this.staker1, amountToUnstake);

      const staker1StakingAmountAfter = await this.stakingContract.getBalance(
        this.staker1
      );
      const staker1ALBTBalanceAfter = await this.ALBTContract.balanceOf(
        this.staker1
      );
      const stakingContractALBTBalanceAfter = await this.ALBTContract.balanceOf(
        this.stakingContract.address
      );
      const stakedSupplyAfter = await this.stakingContract.totalSupply();
      const rALBTBalanceAfter = await this.rALBTContract.balanceOf(
        this.staker1
      );
      const rewardAfter = await this.stakingContract.earned(this.staker1);

      // Then
      expect(staker1StakingAmountAfter).to.be.equal(
        staker1StakingAmountBefore.sub(totalAmountFromStakingToStaker)
      );
      expect(staker1ALBTBalanceAfter).to.be.equal(
        staker1ALBTBalanceBefore.add(totalAmountFromStakingToStaker)
      );
      expect(stakingContractALBTBalanceAfter).to.be.equal(
        stakingContractALBTBalanceBefore.sub(totalAmountFromStakingToStaker)
      );
      expect(stakedSupplyAfter).to.be.equal(
        stakedSupplyBefore.sub(totalAmountFromStakingToStaker)
      );
      expect(Number(rALBTBalanceAfter)).to.be.lessThan(
        Number(rALBTBalanceBefore)
      );
      expect(Number(rewardAfter)).to.be.equal(Number(0));
    });

    it('when unstaking from level 3 to level 2 stake balances are updated accordingly', async function () {
      // Given
      await this.stakingContract
        .connect(this.staker1Signer)
        .stake(StakingType.STAKER_LVL_3_OR_DAO_MEMBER);
      const staker1StakingAmountBefore = await this.stakingContract.getBalance(
        this.staker1
      );
      const staker1ALBTBalanceBefore = await this.ALBTContract.balanceOf(
        this.staker1
      );
      const stakingContractALBTBalanceBefore =
        await this.ALBTContract.balanceOf(this.stakingContract.address);
      const stakedSupplyBefore = await this.stakingContract.totalSupply();
      const rALBTBalanceBefore = await this.rALBTContract.balanceOf(
        this.staker1
      );
      const amountToUnstake = staker1StakingAmountBefore.sub(
        await this.stakingContract.stakingTypeAmounts(StakingType.STAKER_LVL_2)
      );
      const totalAmountFromStakingToStaker = amountToUnstake.add(
        await this.stakingContract.earned(this.staker1)
      );

      // When
      await expect(
        this.stakingContract
          .connect(this.staker1Signer)
          .unstake(StakingType.STAKER_LVL_2)
      )
        .to.emit(this.stakingContract, 'Withdrawn')
        .withArgs(this.staker1, amountToUnstake);

      const staker1StakingAmountAfter = await this.stakingContract.getBalance(
        this.staker1
      );
      const staker1ALBTBalanceAfter = await this.ALBTContract.balanceOf(
        this.staker1
      );
      const stakingContractALBTBalanceAfter = await this.ALBTContract.balanceOf(
        this.stakingContract.address
      );
      const stakedSupplyAfter = await this.stakingContract.totalSupply();
      const rALBTBalanceAfter = await this.rALBTContract.balanceOf(
        this.staker1
      );
      const rewardAfter = await this.stakingContract.earned(this.staker1);

      // Then
      expect(staker1StakingAmountAfter).to.be.equal(
        staker1StakingAmountBefore.sub(totalAmountFromStakingToStaker)
      );
      expect(staker1ALBTBalanceAfter).to.be.equal(
        staker1ALBTBalanceBefore.add(totalAmountFromStakingToStaker)
      );
      expect(stakingContractALBTBalanceAfter).to.be.equal(
        stakingContractALBTBalanceBefore.sub(totalAmountFromStakingToStaker)
      );
      expect(stakedSupplyAfter).to.be.equal(
        stakedSupplyBefore.sub(totalAmountFromStakingToStaker)
      );
      expect(Number(rALBTBalanceAfter)).to.be.lessThan(
        Number(rALBTBalanceBefore)
      );
      expect(Number(rewardAfter)).to.be.equal(Number(0));
    });

    it('when unstaking from level 3 to level 1 stake balances are updated accordingly', async function () {
      // Given
      await this.stakingContract
        .connect(this.staker1Signer)
        .stake(StakingType.STAKER_LVL_3_OR_DAO_MEMBER);
      const staker1StakingAmountBefore = await this.stakingContract.getBalance(
        this.staker1
      );
      const staker1ALBTBalanceBefore = await this.ALBTContract.balanceOf(
        this.staker1
      );
      const stakingContractALBTBalanceBefore =
        await this.ALBTContract.balanceOf(this.stakingContract.address);
      const stakedSupplyBefore = await this.stakingContract.totalSupply();
      const rALBTBalanceBefore = await this.rALBTContract.balanceOf(
        this.staker1
      );
      const amountToUnstake = staker1StakingAmountBefore.sub(
        await this.stakingContract.stakingTypeAmounts(StakingType.STAKER_LVL_1)
      );
      const totalAmountFromStakingToStaker = amountToUnstake.add(
        await this.stakingContract.earned(this.staker1)
      );

      // When
      await expect(
        this.stakingContract
          .connect(this.staker1Signer)
          .unstake(StakingType.STAKER_LVL_1)
      )
        .to.emit(this.stakingContract, 'Withdrawn')
        .withArgs(this.staker1, amountToUnstake);

      const staker1StakingAmountAfter = await this.stakingContract.getBalance(
        this.staker1
      );
      const staker1ALBTBalanceAfter = await this.ALBTContract.balanceOf(
        this.staker1
      );
      const stakingContractALBTBalanceAfter = await this.ALBTContract.balanceOf(
        this.stakingContract.address
      );
      const stakedSupplyAfter = await this.stakingContract.totalSupply();
      const rALBTBalanceAfter = await this.rALBTContract.balanceOf(
        this.staker1
      );
      const rewardAfter = await this.stakingContract.earned(this.staker1);

      // Then
      expect(staker1StakingAmountAfter).to.be.equal(
        staker1StakingAmountBefore.sub(totalAmountFromStakingToStaker)
      );
      expect(staker1ALBTBalanceAfter).to.be.equal(
        staker1ALBTBalanceBefore.add(totalAmountFromStakingToStaker)
      );
      expect(stakingContractALBTBalanceAfter).to.be.equal(
        stakingContractALBTBalanceBefore.sub(totalAmountFromStakingToStaker)
      );
      expect(stakedSupplyAfter).to.be.equal(
        stakedSupplyBefore.sub(totalAmountFromStakingToStaker)
      );
      expect(Number(rALBTBalanceAfter)).to.be.lessThan(
        Number(rALBTBalanceBefore)
      );
      expect(Number(rewardAfter)).to.be.equal(Number(0));
    });
  });
}
