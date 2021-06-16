import {ethers, getNamedAccounts} from 'hardhat';
import chai, {expect} from 'chai';
import {solidity} from 'ethereum-waffle';
import {StakingType} from '../../helpers/registryEnums';
import {BigNumber} from 'ethers';
import {increaseTime} from '../../helpers/time';
const {expectRevert} = require('@openzeppelin/test-helpers');

chai.use(solidity);

export default async function suite() {
  describe('Check execute lottery', async () => {
    it('when execute lottery with a wrong id ', async function () {
      await expectRevert(
        this.registryContract.executeLotteryRun(1000),
        'Can run lottery only in Started state'
      );
    });

    it('when execute show interest for investment with wrong investmentId param ', async function () {
      await expectRevert(
        this.registryContract.showInterestForInvestment(10, 20),
        'Can show interest only in Approved state'
      );
    });

    it('when execute show interest for investment with wrong partitions ', async function () {
      await expectRevert(
        this.registryContract.showInterestForInvestment(this.investmentId, 0),
        'Cannot show interest for 0 partitions'
      );
    });

    it('when execute show interest for investment without lending tokens should revert', async function () {
      await expectRevert(
        this.registryContract.showInterestForInvestment(this.investmentId, 10),
        'ERC20: transfer amount exceeds balance'
      );
    });

    it('when execute lottery and the state is not started should revert  ', async function () {
      // Given and When
      const numberOfPartitions = BigNumber.from(5);
      await this.stakingContract
        .connect(this.lender1Signer)
        .stake(StakingType.STAKER_LVL_2);
      await this.registryContract
        .connect(this.lender1Signer)
        .showInterestForInvestment(this.investmentId, numberOfPartitions);

      // Then
      await expectRevert(
        this.registryContract.executeLotteryRun(this.investmentId),
        'Can run lottery only in Started state'
      );
    });

    it('Can run lottery only if has remaining ticket  ', async function () {
      // Given
      const numberOfPartitions = BigNumber.from(20);
      await this.stakingContract
        .connect(this.lender1Signer)
        .stake(StakingType.STAKER_LVL_2);

      await this.registryContract
        .connect(this.lender1Signer)
        .showInterestForInvestment(this.investmentId, numberOfPartitions);

      // When
      // Move time to 2 days
      await increaseTime(this.deployerSigner.provider, 2 * 24 * 60 * 60); // 2 days

      await this.governanceContract
        .connect(this.superDelegatorSigner)
        .checkCronjobs();

      await this.registryContract
        .connect(this.lender1Signer)
        .executeLotteryRun(this.investmentId);

      // Then
      const ticketsRemainingAfter =
        await this.registryContract.ticketsRemaining(this.investmentId);
      const remainingTicketsPerAddressAfter =
        await this.registryContract.remainingTicketsPerAddress(
          this.investmentId,
          this.lender1
        );
      const ticketsWonPerAddressAfter =
        await this.registryContract.ticketsWonPerAddress(
          this.investmentId,
          this.lender1
        );

      expect(remainingTicketsPerAddressAfter.toNumber()).to.be.equal(0);
      expect(ticketsRemainingAfter.toNumber()).to.be.equal(0);
      expect(ticketsWonPerAddressAfter.toNumber()).to.be.equal(
        numberOfPartitions.toNumber()
      );
    });

    it('Cannot withdraw tickets in a non settled state', async function () {
      await expectRevert(
        this.registryContract.withdrawInvestmentTickets(
          this.investmentId,
          BigNumber.from(10),
          BigNumber.from(10)
        ),
        'Can withdraw only in Settled state'
      );
    });

    it('Try to run lottery with multiple users', async function () {
      // Given
      await this.stakingContract
        .connect(this.lender1Signer)
        .stake(StakingType.STAKER_LVL_2);
      await this.stakingContract
        .connect(this.lender2Signer)
        .stake(StakingType.STAKER_LVL_2);
      await this.stakingContract
        .connect(this.lender3Signer)
        .stake(StakingType.STAKER_LVL_2);

      // When
      await this.registryContract
        .connect(this.lender1Signer)
        .showInterestForInvestment(this.investmentId, BigNumber.from(10));
      await this.registryContract
        .connect(this.lender2Signer)
        .showInterestForInvestment(this.investmentId, BigNumber.from(9));
      await this.registryContract
        .connect(this.lender3Signer)
        .showInterestForInvestment(this.investmentId, BigNumber.from(1));

      // Move time to 2 days
      await increaseTime(this.deployerSigner.provider, 2 * 24 * 60 * 60); // 2 days

      await this.governanceContract
        .connect(this.superDelegatorSigner)
        .checkCronjobs();

      await this.registryContract
        .connect(this.lender3Signer)
        .executeLotteryRun(this.investmentId);

      // Then
      const ticketsRemainingAfter =
        await this.registryContract.ticketsRemaining(this.investmentId);
      const lender1remainingTicketsPerAddressAfter =
        await this.registryContract.remainingTicketsPerAddress(
          this.investmentId,
          this.lender1
        );
      const lender1ticketsWonPerAddressAfter =
        await this.registryContract.ticketsWonPerAddress(
          this.investmentId,
          this.lender1
        );
      const lender2remainingTicketsPerAddressAfter =
        await this.registryContract.remainingTicketsPerAddress(
          this.investmentId,
          this.lender2
        );
      const lender2ticketsWonPerAddressAfter =
        await this.registryContract.ticketsWonPerAddress(
          this.investmentId,
          this.lender2
        );
      const lender3remainingTicketsPerAddressAfter =
        await this.registryContract.remainingTicketsPerAddress(
          this.investmentId,
          this.lender3
        );
      const lender3ticketsWonPerAddressAfter =
        await this.registryContract.ticketsWonPerAddress(
          this.investmentId,
          this.lender3
        );

      expect(ticketsRemainingAfter.toNumber()).to.be.equal(0);
      expect(lender1remainingTicketsPerAddressAfter.toNumber()).to.be.equal(0);
      expect(lender2remainingTicketsPerAddressAfter.toNumber()).to.be.equal(0);
      expect(lender3remainingTicketsPerAddressAfter.toNumber()).to.be.equal(0);
      expect(lender1ticketsWonPerAddressAfter.toNumber()).to.be.equal(10);
      expect(lender2ticketsWonPerAddressAfter.toNumber()).to.be.equal(9);
      expect(lender3ticketsWonPerAddressAfter.toNumber()).to.be.equal(1);
    });

    it('Try to withdraw tickets and revert', async function () {
      // Given
      await this.stakingContract
        .connect(this.lender1Signer)
        .stake(StakingType.STAKER_LVL_2);
      await this.stakingContract
        .connect(this.lender2Signer)
        .stake(StakingType.STAKER_LVL_2);
      await this.stakingContract
        .connect(this.lender3Signer)
        .stake(StakingType.STAKER_LVL_2);

      // When
      await this.registryContract
        .connect(this.lender1Signer)
        .showInterestForInvestment(this.investmentId, BigNumber.from(900));
      await this.registryContract
        .connect(this.lender2Signer)
        .showInterestForInvestment(this.investmentId, BigNumber.from(900));
      await this.registryContract
        .connect(this.lender3Signer)
        .showInterestForInvestment(this.investmentId, BigNumber.from(1200));

      // Move time to 2 days
      await increaseTime(this.deployerSigner.provider, 2 * 24 * 60 * 60); // 2 days

      await this.governanceContract
        .connect(this.superDelegatorSigner)
        .checkCronjobs();

      await this.registryContract
        .connect(this.lender3Signer)
        .executeLotteryRun(this.investmentId);

      // Then
      await expectRevert(
        this.registryContract
          .connect(this.lender1Signer)
          .withdrawInvestmentTickets(this.investmentId, 1000, 700),
        'Not enough tickets won'
      );
    });

    it('Withdraw tickets', async function () {
      // Given
      await this.stakingContract
        .connect(this.lender1Signer)
        .stake(StakingType.STAKER_LVL_2);
      await this.stakingContract
        .connect(this.lender2Signer)
        .stake(StakingType.STAKER_LVL_2);
      await this.stakingContract
        .connect(this.lender3Signer)
        .stake(StakingType.STAKER_LVL_2);

      // When
      await this.registryContract
        .connect(this.lender1Signer)
        .showInterestForInvestment(this.investmentId, BigNumber.from(10));
      await this.registryContract
        .connect(this.lender2Signer)
        .showInterestForInvestment(this.investmentId, BigNumber.from(9));
      await this.registryContract
        .connect(this.lender3Signer)
        .showInterestForInvestment(this.investmentId, BigNumber.from(1));

      // Move time to 2 days
      await increaseTime(this.deployerSigner.provider, 2 * 24 * 60 * 60); // 2 days

      await this.governanceContract
        .connect(this.superDelegatorSigner)
        .checkCronjobs();

      await this.registryContract
        .connect(this.lender3Signer)
        .executeLotteryRun(this.investmentId);

      // const lender3remainingTicketsPerAddressBefore =
      //   await this.registryContract.remainingTicketsPerAddress(
      //     this.investmentId,
      //     this.lender3
      //   );
      // const lendingTokenBalanceBefore =
      //   await this.lendingTokenContract.balanceOf(this.lender3);

      const balanceProjectTokenBefore =
        await this.projectTokenContract.balanceOf(this.lender1);
      await this.registryContract
        .connect(this.lender1Signer)
        .withdrawInvestmentTickets(this.investmentId, 3, 7);
      // await this.registryContract
      //   .connect(this.lender3Signer)
      //   .withdrawAmountProvidedForNonWonTickets(this.investmentId);

      // const lendingTokenBalanceAfter =
      //   await this.lendingTokenContract.balanceOf(this.lender3);

      // Then
      // const lender3remainingTicketsPerAddressAfter =
      //   await this.registryContract.remainingTicketsPerAddress(
      //     this.investmentId,
      //     this.lender3
      //   );
      // expect(
      //   +lender3remainingTicketsPerAddressBefore.toString()
      // ).to.be.greaterThan(+lender3remainingTicketsPerAddressAfter.toString());

      // expect(+lendingTokenBalanceAfter.toString()).to.be.greaterThan(
      //   +lendingTokenBalanceBefore.toString()
      // );

      await expectRevert(
        this.registryContract
          .connect(this.lender1Signer)
          .withdrawAmountProvidedForNonWonTickets(this.investmentId),
        'No non-won tickets to withdraw'
      );

      const balanceProjectTokenAfter =
        await this.projectTokenContract.balanceOf(this.lender1);
      expect(+balanceProjectTokenAfter.toString()).to.be.greaterThan(
        +balanceProjectTokenBefore.toString()
      );
      const lender1ticketsWonPerAddressAfter =
        await this.registryContract.ticketsWonPerAddress(
          this.investmentId,
          this.lender1
        );
      expect(lender1ticketsWonPerAddressAfter.toNumber()).to.be.equal(0);
    });

    it('Withdraw amount provided for non won tickets', async function () {
      // Given
      await this.stakingContract
        .connect(this.lender1Signer)
        .stake(StakingType.STAKER_LVL_2);
      await this.stakingContract
        .connect(this.lender2Signer)
        .stake(StakingType.STAKER_LVL_2);
      await this.stakingContract
        .connect(this.lender3Signer)
        .stake(StakingType.STAKER_LVL_2);

      // When
      await this.registryContract
        .connect(this.lender1Signer)
        .showInterestForInvestment(this.investmentId, BigNumber.from(10));
      await this.registryContract
        .connect(this.lender2Signer)
        .showInterestForInvestment(this.investmentId, BigNumber.from(9));
      await this.registryContract
        .connect(this.lender3Signer)
        .showInterestForInvestment(this.investmentId, BigNumber.from(21));

      // Move time to 2 days
      await increaseTime(this.deployerSigner.provider, 2 * 24 * 60 * 60); // 2 days

      await this.governanceContract
        .connect(this.superDelegatorSigner)
        .checkCronjobs();

      await this.registryContract
        .connect(this.lender3Signer)
        .executeLotteryRun(this.investmentId);

      const lender3remainingTicketsPerAddressBefore =
        await this.registryContract.remainingTicketsPerAddress(
          this.investmentId,
          this.lender3
        );
      const lendingTokenBalanceBefore =
        await this.lendingTokenContract.balanceOf(this.lender3);

      await this.registryContract
        .connect(this.lender3Signer)
        .withdrawAmountProvidedForNonWonTickets(this.investmentId);

      const lendingTokenBalanceAfter =
        await this.lendingTokenContract.balanceOf(this.lender3);

      // Then
      const lender3remainingTicketsPerAddressAfter =
        await this.registryContract.remainingTicketsPerAddress(
          this.investmentId,
          this.lender3
        );
      expect(
        +lender3remainingTicketsPerAddressBefore.toString()
      ).to.be.greaterThan(+lender3remainingTicketsPerAddressAfter.toString());

      expect(+lendingTokenBalanceAfter.toString()).to.be.greaterThan(
        +lendingTokenBalanceBefore.toString()
      );
    });
  });
}
