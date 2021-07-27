import {ethers, getNamedAccounts} from 'hardhat';
import chai, {expect} from 'chai';
import {solidity} from 'ethereum-waffle';
import {StakingType, InvestmentStatus} from '../../helpers/registryEnums';
import {BigNumber} from 'ethers';
import {increaseTime} from '../../helpers/time';
import {getContracts} from '../../helpers/utils';
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

      await expect(
        this.registryContract
          .connect(this.lender1Signer)
          .showInterestForInvestment(this.investmentId, numberOfPartitions)
      )
        .to.emit(this.registryContract, 'InvestmentInterest')
        .withArgs(this.investmentId, this.lender1Signer.address, numberOfPartitions);

      // Then
      await expectRevert(
        this.registryContract.executeLotteryRun(this.investmentId),
        'Can run lottery only in Started state'
      );
    });

    it('when try to convert nft and the state is not settled should revert  ', async function () {
      // Given and When
      const numberOfPartitions = BigNumber.from(5);
      await this.stakingContract
        .connect(this.lender1Signer)
        .stake(StakingType.STAKER_LVL_2);

      await expect(
        this.registryContract
          .connect(this.lender1Signer)
          .showInterestForInvestment(this.investmentId, numberOfPartitions)
      )
        .to.emit(this.registryContract, 'InvestmentInterest')
        .withArgs(this.investmentId, this.lender1Signer.address, numberOfPartitions);

      // Then
      await expectRevert(
        this.registryContract.convertNFTToInvestmentTokens(
          this.investmentId,
          10
        ),
        'Can withdraw only in Settled state'
      );
    });

    it('Can run lottery only if has remaining ticket  ', async function () {
      // Given
      const numberOfPartitions = BigNumber.from(20);
      await this.stakingContract
        .connect(this.lender1Signer)
        .stake(StakingType.STAKER_LVL_2);

      await expect(
        this.registryContract
          .connect(this.lender1Signer)
          .showInterestForInvestment(this.investmentId, numberOfPartitions)
      )
        .to.emit(this.registryContract, 'InvestmentInterest')
        .withArgs(this.investmentId, this.lender1Signer.address, numberOfPartitions);

      // When
      // Move time to 2 days
      await increaseTime(this.deployerSigner.provider, 2 * 24 * 60 * 60); // 2 days

      await this.governanceContract
        .connect(this.superDelegatorSigner)
        .checkCronjobs();

      await expectRevert(
        this.registryContract
          .connect(this.lender2Signer)
          .executeLotteryRun(this.investmentId),
        'Can run lottery only if has remaining ticket'
      );

      await expect(
        this.registryContract
          .connect(this.lender1Signer)
          .executeLotteryRun(this.investmentId)
      )
        .to.emit(this.registryContract, 'LotteryExecuted')
        .withArgs(this.investmentId);

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

      const balanceFundingNFTTokenBefore =
        await this.fundingNFTContract.balanceOf(
          this.lender1,
          this.investmentId.toNumber()
        );

      await expect(
        this.registryContract
          .connect(this.lender1Signer)
          .withdrawInvestmentTickets(this.investmentId, 3, 7)
      )
        .to.emit(this.registryContract, 'WithdrawInvestmentTickets')
        .withArgs(this.investmentId, 3, 7);

      await expectRevert(
        this.registryContract
          .connect(this.lender1Signer)
          .withdrawAmountProvidedForNonWonTickets(this.investmentId),
        'No non-won tickets to withdraw'
      );

      const balanceFundingNFTTokenAfter =
        await this.fundingNFTContract.balanceOf(
          this.lender1,
          this.investmentId.toNumber()
        );
      expect(+balanceFundingNFTTokenAfter.toString()).to.be.greaterThan(
        +balanceFundingNFTTokenBefore.toString()
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

      const baseAmountForEachPartition =
        await this.registryContract.baseAmountForEachPartition();
      const amountToReturnForNonWonTickets =
        lender3remainingTicketsPerAddressBefore.mul(baseAmountForEachPartition);

      await expect(
        this.registryContract
          .connect(this.lender3Signer)
          .withdrawAmountProvidedForNonWonTickets(this.investmentId)
      )
        .to.emit(this.registryContract, 'WithdrawAmountForNonTickets')
        .withArgs(this.investmentId, amountToReturnForNonWonTickets);

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

    it('When executing multiple runs of the lottery', async function () {
      // Given
      const amountOfTokensToBePurchased = ethers.utils.parseEther('80');
      const totalAmountRequested = ethers.utils.parseEther('250'); // 25 > 20 (every run number) tickets
      const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

      await this.registryContract
        .connect(this.seekerSigner)
        .requestInvestment(
          this.investmentTokenContract.address,
          amountOfTokensToBePurchased,
          this.lendingTokenContract.address,
          totalAmountRequested,
          ipfsHash
        );

      await this.governanceContract
        .connect(this.superDelegatorSigner)
        .superVoteForRequest(this.approvalRequest.add(1), true);

      await this.stakingContract
        .connect(this.lender1Signer)
        .stake(StakingType.STAKER_LVL_2);

      await this.stakingContract
        .connect(this.lender2Signer)
        .stake(StakingType.STAKER_LVL_2);

      const numberOfPartitions = 26;

      await this.registryContract
        .connect(this.lender1Signer)
        .showInterestForInvestment(
          this.investmentId.add(1),
          numberOfPartitions
        );

      await this.registryContract
        .connect(this.lender2Signer)
        .showInterestForInvestment(
          this.investmentId.add(1),
          numberOfPartitions
        );

      // When
      // Move time to 2 days
      await increaseTime(this.deployerSigner.provider, 2 * 24 * 60 * 60); // 2 days

      const previousCronjobList = await this.governanceContract.cronjobList();

      // This should trigger the investment 1 which has no participants, so it should extend.
      await this.governanceContract
        .connect(this.superDelegatorSigner)
        .checkCronjobs();

      // There should be a new Cronjob one day after previous one with same external id.
      const afterFirstCronjobList = await this.governanceContract.cronjobList();

      // This triggers the investment handled in this test.
      await this.governanceContract
        .connect(this.superDelegatorSigner)
        .checkCronjobs();

      const afterSecondCronjobList =
        await this.governanceContract.cronjobList();

      await this.registryContract
        .connect(this.lender1Signer)
        .executeLotteryRun(this.investmentId.add(1));

      const statusBeforeSecondRun =
        await this.registryContract.investmentStatus(this.investmentId.add(1));

      await this.registryContract
        .connect(this.lender2Signer)
        .executeLotteryRun(this.investmentId.add(1));

      const statusAfterSecondRun = await this.registryContract.investmentStatus(
        this.investmentId.add(1)
      );

      // Then
      expect(previousCronjobList.head.toString()).to.be.equal('1');
      expect(previousCronjobList.tail.toString()).to.be.equal('2');
      expect(previousCronjobList.size.toString()).to.be.equal('2');

      expect(afterFirstCronjobList.head.toString()).to.be.equal('2');
      expect(afterFirstCronjobList.tail.toString()).to.be.equal('3');
      expect(afterFirstCronjobList.size.toString()).to.be.equal('2');

      expect(afterSecondCronjobList.head.toString()).to.be.equal('3');
      expect(afterSecondCronjobList.tail.toString()).to.be.equal('3');
      expect(afterSecondCronjobList.size.toString()).to.be.equal('1');

      expect(statusBeforeSecondRun.toString()).to.be.equal(
        InvestmentStatus.STARTED
      );
      expect(statusAfterSecondRun.toString()).to.be.equal(
        InvestmentStatus.SETTLED
      );
    });

    context('When doing various withdrawals scenarios', async function () {
      beforeEach(async function () {
        // Given
        const amountOfTokensToBePurchased = ethers.utils.parseEther('1000');
        const totalAmountRequested = ethers.utils.parseEther('100'); // 10 tickets
        const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

        await this.registryContract
          .connect(this.seekerSigner)
          .requestInvestment(
            this.investmentTokenContract.address,
            amountOfTokensToBePurchased,
            this.lendingTokenContract.address,
            totalAmountRequested,
            ipfsHash
          );

        await this.governanceContract
          .connect(this.superDelegatorSigner)
          .superVoteForRequest(this.approvalRequest.add(1), true);

        await this.stakingContract
          .connect(this.lender1Signer)
          .stake(StakingType.STAKER_LVL_2);

        const numberOfPartitions = 11;

        await this.registryContract
          .connect(this.lender1Signer)
          .showInterestForInvestment(
            this.investmentId.add(1),
            numberOfPartitions
          );

        // Move time to 2 days
        await increaseTime(this.deployerSigner.provider, 2 * 24 * 60 * 60); // 2 days

        // This should trigger the investment 1 which has no participants, so it should extend.
        await this.governanceContract
          .connect(this.superDelegatorSigner)
          .checkCronjobs();

        // This triggers the investment handled in this test.
        await this.governanceContract
          .connect(this.superDelegatorSigner)
          .checkCronjobs();

        await this.registryContract
          .connect(this.lender1Signer)
          .executeLotteryRun(this.investmentId.add(1));
      });

      it('When withdrawing with 0 ticketsToLock', async function () {
        const ticketsToLock = 0;
        const ticketsToWithdraw = 10;
        const investmentId = this.investmentId.add(1);

        const balanceOfNFTTokensBefore =
          await this.fundingNFTContract.balanceOf(
            this.lender1,
            investmentId.toNumber()
          );

        await this.registryContract
          .connect(this.lender1Signer)
          .withdrawInvestmentTickets(
            investmentId,
            ticketsToLock,
            ticketsToWithdraw
          );

        const balanceOfNFTTokensAfter = await this.fundingNFTContract.balanceOf(
          this.lender1,
          investmentId.toNumber()
        );

        const nftTokensGot = balanceOfNFTTokensAfter.sub(
          balanceOfNFTTokensBefore
        );

        // Then
        expect(nftTokensGot.toNumber()).to.be.equal(ticketsToWithdraw);
      });

      it('When withdrawing with 0 ticketsToWithdraw', async function () {
        const ticketsToLock = 10;
        const ticketsToWithdraw = 0;
        const investmentId = this.investmentId.add(1);

        const balanceOfNFTTokensBefore =
          await this.fundingNFTContract.balanceOf(this.lender1, investmentId);
        const lockedTicketsBefore =
          await this.registryContract.lockedTicketsPerAddress(this.lender1);

        await this.registryContract
          .connect(this.lender1Signer)
          .withdrawInvestmentTickets(
            investmentId,
            ticketsToLock,
            ticketsToWithdraw
          );

        const balanceOfNFTTokensAfter = await this.fundingNFTContract.balanceOf(
          this.lender1,
          investmentId
        );
        const lockedTicketsAfter =
          await this.registryContract.lockedTicketsPerAddress(this.lender1);

        const NFTTokensGot = balanceOfNFTTokensAfter.sub(
          balanceOfNFTTokensBefore
        );

        // Then
        expect(NFTTokensGot.toString()).to.be.equal('0');
        expect(
          lockedTicketsAfter.sub(lockedTicketsBefore).toString()
        ).to.be.equal(ticketsToLock.toString());

        await expectRevert(
          this.registryContract
            .connect(this.lender1Signer)
            .convertNFTToInvestmentTokens(investmentId, 10),
          'Not enough NFT to convert'
        );
      });

      it('When withdrawing only non-won tickets', async function () {
        const ticketsNotWon = BigNumber.from(1);
        const baseAmountForEachTicket =
          await this.registryContract.baseAmountForEachPartition();

        const balanceOfLendingTokensBefore =
          await this.lendingTokenContract.balanceOf(this.lender1);

        await this.registryContract
          .connect(this.lender1Signer)
          .withdrawAmountProvidedForNonWonTickets(this.investmentId.add(1));

        const balanceOfLendingTokensAfter =
          await this.lendingTokenContract.balanceOf(this.lender1);
        const lockedTicketsAfter =
          await this.registryContract.lockedTicketsPerAddress(this.lender1);

        const lendingTokensGot = balanceOfLendingTokensAfter.sub(
          balanceOfLendingTokensBefore
        );
        const lendingTokensToGet = ticketsNotWon.mul(baseAmountForEachTicket);

        // Then
        expect(lendingTokensGot.toString()).to.be.equal(
          lendingTokensToGet.toString()
        );
      });

      it('When trying to withdraw non won tickets in non-settled state', async function () {
        await expectRevert(
          this.registryContract
            .connect(this.lender1Signer)
            .withdrawAmountProvidedForNonWonTickets(this.investmentId),
          'Can withdraw only in Settled state'
        );
      });

      it('When withdrawing with 0 ticketsToLock the user will be able to convert his NFT', async function () {
        const {investmentTokenContract} = await getContracts();

        const ticketsToLock = 0;
        const ticketsToWithdraw = 10;
        const investmentId = this.investmentId.add(1);

        const balanceOfNFTTokensBefore =
          await this.fundingNFTContract.balanceOf(
            this.lender1,
            investmentId.toNumber()
          );

        await this.registryContract
          .connect(this.lender1Signer)
          .withdrawInvestmentTickets(
            investmentId,
            ticketsToLock,
            ticketsToWithdraw
          );

        const balanceOfNFTTokensAfter = await this.fundingNFTContract.balanceOf(
          this.lender1,
          investmentId.toNumber()
        );

        const nftTokensGot = balanceOfNFTTokensAfter.sub(
          balanceOfNFTTokensBefore
        );

        expect(nftTokensGot.toNumber()).to.be.equal(ticketsToWithdraw);

        const investmentTokensPerTicket =
          await this.registryContract.investmentTokensPerTicket(investmentId);
        const amountOfInvestmentTokenToTransfer =
          investmentTokensPerTicket.mul(ticketsToWithdraw);

        await expect(
          this.registryContract
            .connect(this.lender1Signer)
            .convertNFTToInvestmentTokens(investmentId, ticketsToWithdraw)
        )
          .to.emit(this.registryContract, 'ConvertNFTToInvestmentTokens')
          .withArgs(
            investmentId,
            ticketsToWithdraw,
            amountOfInvestmentTokenToTransfer
          );

        const balanceOfInvestmentToken =
          await investmentTokenContract.balanceOf(this.lender1);
        const balanceOfNFTTokens = await this.fundingNFTContract.balanceOf(
          this.lender1,
          investmentId.toNumber()
        );

        expect(
          ethers.utils.formatEther(balanceOfInvestmentToken.toString())
        ).to.be.equal('1000.0');
        expect(balanceOfNFTTokens.toNumber()).to.be.equal(0);
      });

      it('When withdrawing with 0 ticketsToLock the user will not be able to convert if amount is zero', async function () {
        const {investmentTokenContract} = await getContracts();

        const ticketsToLock = 0;
        const ticketsToWithdraw = 10;
        const investmentId = this.investmentId.add(1);

        const balanceOfNFTTokensBefore =
          await this.fundingNFTContract.balanceOf(
            this.lender1,
            investmentId.toNumber()
          );

        await this.registryContract
          .connect(this.lender1Signer)
          .withdrawInvestmentTickets(
            investmentId,
            ticketsToLock,
            ticketsToWithdraw
          );

        const balanceOfNFTTokensAfter = await this.fundingNFTContract.balanceOf(
          this.lender1,
          investmentId.toNumber()
        );

        const nftTokensGot = balanceOfNFTTokensAfter.sub(
          balanceOfNFTTokensBefore
        );

        expect(nftTokensGot.toNumber()).to.be.equal(ticketsToWithdraw);

        await expectRevert(
          this.registryContract
            .connect(this.lender1Signer)
            .convertNFTToInvestmentTokens(investmentId, 0),
          'Amount of nft to convert cannot be 0'
        );
      });

      it('When seeker withdraws from non settled investments', async function () {
        await expectRevert(
          this.registryContract
            .connect(this.seekerSigner)
            .withdrawInvestment(this.investmentId),
          'Can withdraw only in Settled state'
        );
      });
      it('When non seeker tries to call withdraw investments', async function () {
        const investmentId = this.investmentId.add(1);
        await expectRevert(
          this.registryContract
            .connect(this.lender1Signer)
            .withdrawInvestment(investmentId),
          'Only seeker can withdraw'
        );
      });
      it('When seeker withdraws lended tokens', async function () {
        // given
        const investmentId = this.investmentId.add(1);
        const seekerInitialLendingBalance =
          await this.lendingTokenContract.balanceOf(this.seekerSigner.address);
        const expectedAmount = (
          await this.registryContract.investmentDetails(investmentId)
        ).totalAmountToBeRaised;

        // when
        await expect(
          this.registryContract
            .connect(this.seekerSigner)
            .withdrawInvestment(investmentId)
        )
          .to.emit(this.registryContract, 'seekerWithdrawInvestment')
          .withArgs(investmentId, expectedAmount);

        await expectRevert(
          this.registryContract
            .connect(this.seekerSigner)
            .withdrawInvestment(investmentId),
          'Already withdrawn'
        );
        100000000000000000000;
        const seekerFinalLendingBalance =
          await this.lendingTokenContract.balanceOf(this.seekerSigner.address);
        const investmentWithdrawn =
          await this.registryContract.investmentWithdrawn(investmentId);
        const seekerGotLendingTokens = seekerFinalLendingBalance.eq(
          seekerInitialLendingBalance.add(expectedAmount)
        );
        //then
        expect(investmentWithdrawn).to.be.equal(true);
        expect(seekerGotLendingTokens).to.be.equal(true);
      });
    });

    context(
      'When doing various withdrawals scenarios after already locked tokens',
      async function () {
        beforeEach(async function () {
          // Given
          const amountOfTokensToBePurchased = ethers.utils.parseEther('1000');
          const totalAmountRequested = ethers.utils.parseEther('100'); // 10 tickets
          const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

          await this.registryContract
            .connect(this.seekerSigner)
            .requestInvestment(
              this.investmentTokenContract.address,
              amountOfTokensToBePurchased,
              this.lendingTokenContract.address,
              totalAmountRequested,
              ipfsHash
            );

          await this.governanceContract
            .connect(this.superDelegatorSigner)
            .superVoteForRequest(this.approvalRequest.add(1), true);

          await this.stakingContract
            .connect(this.lender1Signer)
            .stake(StakingType.STAKER_LVL_2);

          const numberOfPartitions = 10;

          await this.registryContract
            .connect(this.lender1Signer)
            .showInterestForInvestment(
              this.investmentId.add(1),
              numberOfPartitions
            );

          // Move time to 2 days
          await increaseTime(this.deployerSigner.provider, 2 * 24 * 60 * 60); // 2 days

          // This should trigger the investment 1 which has no participants, so it should extend.
          await this.governanceContract
            .connect(this.superDelegatorSigner)
            .checkCronjobs();

          // This triggers the investment handled in this test.
          await this.governanceContract
            .connect(this.superDelegatorSigner)
            .checkCronjobs();

          await this.registryContract
            .connect(this.lender1Signer)
            .executeLotteryRun(this.investmentId.add(1));

          const ticketsToLock = 10;
          const ticketsToWithdraw = 0;

          await this.registryContract
            .connect(this.lender1Signer)
            .withdrawInvestmentTickets(
              this.investmentId.add(1),
              ticketsToLock,
              ticketsToWithdraw
            );

          await this.registryContract
            .connect(this.seekerSigner)
            .requestInvestment(
              this.investmentTokenContract.address,
              amountOfTokensToBePurchased,
              this.lendingTokenContract.address,
              totalAmountRequested,
              ipfsHash
            );

          await this.governanceContract
            .connect(this.superDelegatorSigner)
            .superVoteForRequest(this.approvalRequest.add(2), true);
        });

        it('When showing interest should have more rALBT', async function () {
          const balanceOfReputationalTokensBefore =
            await this.rALBTContract.balanceOf(this.lender1);

          const numberOfPartitions = 10;

          await this.registryContract
            .connect(this.lender1Signer)
            .showInterestForInvestment(
              this.investmentId.add(2),
              numberOfPartitions
            );

          const balanceOfReputationalTokensAfter =
            await this.rALBTContract.balanceOf(this.lender1);

          const balanceUpdate = balanceOfReputationalTokensAfter.sub(
            balanceOfReputationalTokensBefore
          );

          // Then
          expect(Number(balanceUpdate)).to.be.greaterThan(0);
        });

        it('When withdrawing locked tokens should have more rALBT and investmentTokens', async function () {
          const balanceOfReputationalTokensBefore =
            await this.rALBTContract.balanceOf(this.lender1);
          const investmentId = this.investmentId.add(1);
          const numberOfPartitions = BigNumber.from(10);

          const balanceFundingNFTTokenBefore =
            await this.fundingNFTContract.balanceOf(
              this.lender1,
              investmentId.toNumber()
            );

          await this.registryContract
            .connect(this.lender1Signer)
            .withdrawLockedInvestmentTickets(investmentId, numberOfPartitions);

          const balanceOfReputationalTokensAfter =
            await this.rALBTContract.balanceOf(this.lender1);

          const reputationalBalanceUpdate =
            balanceOfReputationalTokensAfter.sub(
              balanceOfReputationalTokensBefore
            );

          const balanceFundingNFTTokenAfter =
            await this.fundingNFTContract.balanceOf(
              this.lender1,
              investmentId.toNumber()
            );

          // Then
          expect(+reputationalBalanceUpdate.toString()).to.be.greaterThan(0);
          expect(+balanceFundingNFTTokenAfter.toString()).to.be.greaterThan(
            +balanceFundingNFTTokenBefore.toString()
          );
        });

        it('Should revert when trying to withdraw more than locked tickets', async function () {
          const numberOfPartitions = BigNumber.from(12);
          await expectRevert(
            this.registryContract
              .connect(this.lender1Signer)
              .withdrawLockedInvestmentTickets(
                this.investmentId.add(1),
                numberOfPartitions
              ),
            'Not enough tickets to withdraw'
          );
        });

        it('Should revert when trying to withdraw locked tickets on non settled state', async function () {
          const numberOfPartitions = BigNumber.from(5);
          await expectRevert(
            this.registryContract
              .connect(this.lender1Signer)
              .withdrawLockedInvestmentTickets(
                this.investmentId,
                numberOfPartitions
              ),
            'Can withdraw only in Settled state'
          );
        });
      }
    );
  });
}
