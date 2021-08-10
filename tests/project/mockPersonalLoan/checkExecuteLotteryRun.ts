import {ethers, getNamedAccounts} from 'hardhat';
import chai, {expect} from 'chai';
import {solidity} from 'ethereum-waffle';
import {StakingType, ProjectStatusTypes} from '../../helpers/ProjectEnums';
import {BigNumber} from 'ethers';
import {increaseTime} from '../../helpers/time';
import {getContracts} from '../../helpers/utils';
const {expectRevert} = require('@openzeppelin/test-helpers');

chai.use(solidity);

export default async function suite() {
  describe('Check execute lottery', async () => {
    it('when execute lottery with a wrong id ', async function () {
      await expectRevert(
        this.mockPersonalLoanContract.executeLotteryRun(1000),
        'Can run lottery only in Started state'
      );
    });

    it('when execute show interest for personalLoan with wrong projectId param ', async function () {
      await expectRevert(
        this.mockPersonalLoanContract.showInterestForInvestment(10, 20),
        'Can show interest only in Approved state'
      );
    });

    it('when execute show interest for personalLoan with wrong partitions ', async function () {
      await expectRevert(
        this.mockPersonalLoanContract.showInterestForInvestment(this.projectId, 0),
        'Cannot show interest for 0 partitions'
      );
    });

    it('when execute show interest for personalLoan without lending tokens should revert', async function () {
      await expectRevert(
        this.mockPersonalLoanContract.showInterestForInvestment(this.projectId, 10),
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
        this.mockPersonalLoanContract
          .connect(this.lender1Signer)
          .showInterestForInvestment(this.projectId, numberOfPartitions)
      )
        .to.emit(this.mockPersonalLoanContract, 'ProjectInterest')
        .withArgs(this.projectId, numberOfPartitions);

      // Then
      await expectRevert(
        this.mockPersonalLoanContract.executeLotteryRun(this.projectId),
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
        this.mockPersonalLoanContract
          .connect(this.lender1Signer)
          .showInterestForInvestment(this.projectId, numberOfPartitions)
      )
        .to.emit(this.mockPersonalLoanContract, 'ProjectInterest')
        .withArgs(this.projectId, numberOfPartitions);

      // Then
      await expectRevert(
        this.mockPersonalLoanContract.convertNFTToInvestmentTokens(
          this.projectId,
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
        this.mockPersonalLoanContract
          .connect(this.lender1Signer)
          .showInterestForInvestment(this.projectId, numberOfPartitions)
      )
        .to.emit(this.mockPersonalLoanContract, 'ProjectInterest')
        .withArgs(this.projectId, numberOfPartitions);

      // When
      // Move time to 2 days
      await increaseTime(this.deployerSigner.provider, 2 * 24 * 60 * 60); // 2 days

      await this.governanceContract
        .connect(this.superDelegatorSigner)
        .checkCronjobs();

      await expectRevert(
        this.mockPersonalLoanContract
          .connect(this.lender2Signer)
          .executeLotteryRun(this.projectId),
        'Can run lottery only if has remaining ticket'
      );

      await expect(
        this.mockPersonalLoanContract
          .connect(this.lender1Signer)
          .executeLotteryRun(this.projectId)
      )
        .to.emit(this.mockPersonalLoanContract, 'LotteryExecuted')
        .withArgs(this.projectId);

      // Then
      const ticketsRemainingAfter =
        await this.mockPersonalLoanContract.ticketsRemaining(this.projectId);
      const remainingTicketsPerAddressAfter =
        await this.mockPersonalLoanContract.remainingTicketsPerAddress(
          this.projectId,
          this.lender1
        );
      const ticketsWonPerAddressAfter =
        await this.mockPersonalLoanContract.ticketsWonPerAddress(
          this.projectId,
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
        this.mockPersonalLoanContract.convertInvestmentTicketsToNfts(
          this.projectId,
        ),
        'Can convert only in Settled state'
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
      await this.mockPersonalLoanContract
        .connect(this.lender1Signer)
        .showInterestForInvestment(this.projectId, BigNumber.from(10));
      await this.mockPersonalLoanContract
        .connect(this.lender2Signer)
        .showInterestForInvestment(this.projectId, BigNumber.from(9));
      await this.mockPersonalLoanContract
        .connect(this.lender3Signer)
        .showInterestForInvestment(this.projectId, BigNumber.from(1));

      // Move time to 2 days
      await increaseTime(this.deployerSigner.provider, 2 * 24 * 60 * 60); // 2 days

      await this.governanceContract
        .connect(this.superDelegatorSigner)
        .checkCronjobs();

      await this.mockPersonalLoanContract
        .connect(this.lender3Signer)
        .executeLotteryRun(this.projectId);

      // Then
      const ticketsRemainingAfter =
        await this.mockPersonalLoanContract.ticketsRemaining(this.projectId);
      const lender1remainingTicketsPerAddressAfter =
        await this.mockPersonalLoanContract.remainingTicketsPerAddress(
          this.projectId,
          this.lender1
        );
      const lender1ticketsWonPerAddressAfter =
        await this.mockPersonalLoanContract.ticketsWonPerAddress(
          this.projectId,
          this.lender1
        );
      const lender2remainingTicketsPerAddressAfter =
        await this.mockPersonalLoanContract.remainingTicketsPerAddress(
          this.projectId,
          this.lender2
        );
      const lender2ticketsWonPerAddressAfter =
        await this.mockPersonalLoanContract.ticketsWonPerAddress(
          this.projectId,
          this.lender2
        );
      const lender3remainingTicketsPerAddressAfter =
        await this.mockPersonalLoanContract.remainingTicketsPerAddress(
          this.projectId,
          this.lender3
        );
      const lender3ticketsWonPerAddressAfter =
        await this.mockPersonalLoanContract.ticketsWonPerAddress(
          this.projectId,
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
      await this.mockPersonalLoanContract
        .connect(this.lender1Signer)
        .showInterestForInvestment(this.projectId, BigNumber.from(10));
      await this.mockPersonalLoanContract
        .connect(this.lender2Signer)
        .showInterestForInvestment(this.projectId, BigNumber.from(9));
      await this.mockPersonalLoanContract
        .connect(this.lender3Signer)
        .showInterestForInvestment(this.projectId, BigNumber.from(1));

      // Move time to 2 days
      await increaseTime(this.deployerSigner.provider, 2 * 24 * 60 * 60); // 2 days

      await this.governanceContract
        .connect(this.superDelegatorSigner)
        .checkCronjobs();

      await this.mockPersonalLoanContract
        .connect(this.lender3Signer)
        .executeLotteryRun(this.projectId);

      const balanceFundingNFTTokenBefore =
        await this.fundingNFTContract.balanceOf(
          this.lender1,
          this.projectId.toNumber()
        );
      const lender1ticketsWonPerAddressBefore =
      await this.mockPersonalLoanContract.ticketsWonPerAddress(
        this.projectId,
        this.lender1
      );

      await expect(
        this.mockPersonalLoanContract
          .connect(this.lender1Signer)
          .convertInvestmentTicketsToNfts(this.projectId)
      )
        .to.emit(this.mockPersonalLoanContract, 'ConvertInvestmentTickets')
        .withArgs(this.projectId, this.lender1, lender1ticketsWonPerAddressBefore);

      await expectRevert(
        this.mockPersonalLoanContract
          .connect(this.lender1Signer)
          .withdrawAmountProvidedForNonWonTickets(this.projectId),
        'No non-won tickets to withdraw'
      );

      const balanceFundingNFTTokenAfter =
        await this.fundingNFTContract.balanceOf(
          this.lender1,
          this.projectId.toNumber()
        );
      expect(+balanceFundingNFTTokenAfter.toString()).to.be.greaterThan(
        +balanceFundingNFTTokenBefore.toString()
      );
      const lender1ticketsWonPerAddressAfter =
        await this.mockPersonalLoanContract.ticketsWonPerAddress(
          this.projectId,
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
      await this.mockPersonalLoanContract
        .connect(this.lender1Signer)
        .showInterestForInvestment(this.projectId, BigNumber.from(10));
      await this.mockPersonalLoanContract
        .connect(this.lender2Signer)
        .showInterestForInvestment(this.projectId, BigNumber.from(9));
      await this.mockPersonalLoanContract
        .connect(this.lender3Signer)
        .showInterestForInvestment(this.projectId, BigNumber.from(21));

      // Move time to 2 days
      await increaseTime(this.deployerSigner.provider, 2 * 24 * 60 * 60); // 2 days

      await this.governanceContract
        .connect(this.superDelegatorSigner)
        .checkCronjobs();

      await this.mockPersonalLoanContract
        .connect(this.lender3Signer)
        .executeLotteryRun(this.projectId);

      const lender3remainingTicketsPerAddressBefore =
        await this.mockPersonalLoanContract.remainingTicketsPerAddress(
          this.projectId,
          this.lender3
        );
      const lendingTokenBalanceBefore =
        await this.lendingTokenContract.balanceOf(this.lender3);

      const baseAmountForEachPartition =
        await this.mockPersonalLoanContract.baseAmountForEachPartition();
      const amountToReturnForNonWonTickets =
        lender3remainingTicketsPerAddressBefore.mul(baseAmountForEachPartition);

      await expect(
        this.mockPersonalLoanContract
          .connect(this.lender3Signer)
          .withdrawAmountProvidedForNonWonTickets(this.projectId)
      )
        .to.emit(this.mockPersonalLoanContract, 'LotteryLoserClaimedFunds')
        .withArgs(this.projectId, amountToReturnForNonWonTickets);

      const lendingTokenBalanceAfter =
        await this.lendingTokenContract.balanceOf(this.lender3);

      // Then
      const lender3remainingTicketsPerAddressAfter =
        await this.mockPersonalLoanContract.remainingTicketsPerAddress(
          this.projectId,
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

      await this.mockPersonalLoanContract
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

      await this.mockPersonalLoanContract
        .connect(this.lender1Signer)
        .showInterestForInvestment(this.projectId.add(1), numberOfPartitions);

      await this.mockPersonalLoanContract
        .connect(this.lender2Signer)
        .showInterestForInvestment(this.projectId.add(1), numberOfPartitions);

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

      await this.mockPersonalLoanContract
        .connect(this.lender1Signer)
        .executeLotteryRun(this.projectId.add(1));

      const statusBeforeSecondRun =
        await this.mockPersonalLoanContract.projectStatus(this.projectId.add(1));

      await this.mockPersonalLoanContract
        .connect(this.lender2Signer)
        .executeLotteryRun(this.projectId.add(1));

      const statusAfterSecondRun =
        await this.mockPersonalLoanContract.projectStatus(this.projectId.add(1));

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
        ProjectStatusTypes.STARTED
      );
      expect(statusAfterSecondRun.toString()).to.be.equal(
        ProjectStatusTypes.SETTLED
      );
    });

    context('When doing various withdrawals scenarios', async function () {
      beforeEach(async function () {
        // Given
        const amountOfTokensToBePurchased = ethers.utils.parseEther('1000');
        const totalAmountRequested = ethers.utils.parseEther('100'); // 10 tickets
        const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

        await this.mockPersonalLoanContract
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

        await this.mockPersonalLoanContract
          .connect(this.lender1Signer)
          .showInterestForInvestment(this.projectId.add(1), numberOfPartitions);

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

        await this.mockPersonalLoanContract
          .connect(this.lender1Signer)
          .executeLotteryRun(this.projectId.add(1));
      });

      it('When withdrawing with 0 ticketsToLock', async function () {
        const ticketsToLock = 0;
        const ticketsToWithdraw = 10;
        const investmentId = this.projectId.add(1);

        const balanceOfNFTTokensBefore =
          await this.fundingNFTContract.balanceOf(
            this.lender1,
            investmentId.toNumber()
          );

        await this.mockPersonalLoanContract
          .connect(this.lender1Signer)
          .convertInvestmentTicketsToNfts(
            investmentId,
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
        const investmentId = this.projectId.add(1);

        const balanceOfNFTTokensBefore =
          await this.fundingNFTContract.balanceOf(this.lender1, investmentId);
        const lockedNftsBefore =
          await this.mockPersonalLoanContract.lockedNftsPerAddress(this.lender1);

        await this.mockPersonalLoanContract
          .connect(this.lender1Signer)
          .convertInvestmentTicketsToNfts(
            investmentId,
          );

        await this.fundingNFTContract
          .connect(this.lender1Signer)
          .setApprovalForAll(this.escrowContract.address, true);

        await this.mockPersonalLoanContract
          .connect(this.lender1Signer)
          .lockInvestmentNfts(
            investmentId,
            ticketsToLock,
          );

        const balanceOfNFTTokensAfter = await this.fundingNFTContract.balanceOf(
          this.lender1,
          investmentId
        );
        const lockedNftsAfter =
          await this.mockPersonalLoanContract.lockedNftsPerAddress(this.lender1);

        const NFTTokensGot = balanceOfNFTTokensAfter.sub(
          balanceOfNFTTokensBefore
        );

        // Then
        expect(NFTTokensGot.toString()).to.be.equal('0');
        expect(
          lockedNftsAfter.sub(lockedNftsBefore).toString()
        ).to.be.equal(ticketsToLock.toString());

        await expectRevert(
          this.mockPersonalLoanContract
            .connect(this.lender1Signer)
            .convertNFTToInvestmentTokens(investmentId, 10),
          'Not enough NFT to convert'
        );
      });

      it('When withdrawing only non-won tickets', async function () {
        const ticketsNotWon = BigNumber.from(1);
        const baseAmountForEachTicket =
          await this.mockPersonalLoanContract.baseAmountForEachPartition();

        const balanceOfLendingTokensBefore =
          await this.lendingTokenContract.balanceOf(this.lender1);

        await this.mockPersonalLoanContract
          .connect(this.lender1Signer)
          .withdrawAmountProvidedForNonWonTickets(this.projectId.add(1));

        const balanceOfLendingTokensAfter =
          await this.lendingTokenContract.balanceOf(this.lender1);
        const lockedNftsAfter =
          await this.mockPersonalLoanContract.lockedNftsPerAddress(this.lender1);

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
          this.mockPersonalLoanContract
            .connect(this.lender1Signer)
            .withdrawAmountProvidedForNonWonTickets(this.projectId),
          'Can withdraw only in Settled state'
        );
      });

      it('When withdrawing with 0 ticketsToLock the user will be able to convert his NFT', async function () {
        const {investmentTokenContract} = await getContracts();

        const ticketsToWithdraw = 10;
        const investmentId = this.projectId.add(1);

        const balanceOfNFTTokensBefore =
          await this.fundingNFTContract.balanceOf(
            this.lender1,
            investmentId.toNumber()
          );

        await this.mockPersonalLoanContract
          .connect(this.lender1Signer)
          .convertInvestmentTicketsToNfts(
            investmentId,
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
          await this.mockPersonalLoanContract.investmentTokensPerTicket(
            investmentId
          );
        const amountOfInvestmentTokenToTransfer =
          investmentTokensPerTicket.mul(ticketsToWithdraw);

        await expect(
          this.mockPersonalLoanContract
            .connect(this.lender1Signer)
            .convertNFTToInvestmentTokens(investmentId, ticketsToWithdraw)
        )
          .to.emit(this.mockPersonalLoanContract, 'ConvertNFTToInvestmentTokens')
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
        const ticketsToWithdraw = 10;
        const investmentId = this.projectId.add(1);

        const balanceOfNFTTokensBefore =
          await this.fundingNFTContract.balanceOf(
            this.lender1,
            investmentId.toNumber()
          );

        await this.mockPersonalLoanContract
          .connect(this.lender1Signer)
          .convertInvestmentTicketsToNfts(
            investmentId,
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
          this.mockPersonalLoanContract
            .connect(this.lender1Signer)
            .convertNFTToInvestmentTokens(investmentId, 0),
          'Amount of nft to convert cannot be 0'
        );
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

          await this.mockPersonalLoanContract
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

          await this.mockPersonalLoanContract
            .connect(this.lender1Signer)
            .showInterestForInvestment(
              this.projectId.add(1),
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

          await this.mockPersonalLoanContract
            .connect(this.lender1Signer)
            .executeLotteryRun(this.projectId.add(1));

          const ticketsToLock = 10;

          await this.mockPersonalLoanContract
            .connect(this.lender1Signer)
            .convertInvestmentTicketsToNfts(
              this.projectId.add(1),
            );

          await this.fundingNFTContract
            .connect(this.lender1Signer)
            .setApprovalForAll(this.escrowContract.address, true);

          await this.mockPersonalLoanContract
            .connect(this.lender1Signer)
            .lockInvestmentNfts(
              this.projectId.add(1),
              ticketsToLock,
            );

          await this.mockPersonalLoanContract
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

          await this.mockPersonalLoanContract
            .connect(this.lender1Signer)
            .showInterestForInvestment(
              this.projectId.add(2),
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
          const investmentId = this.projectId.add(1);
          const numberOfPartitions = BigNumber.from(10);

          const balanceFundingNFTTokenBefore =
            await this.fundingNFTContract.balanceOf(
              this.lender1,
              investmentId.toNumber()
            );

          await this.mockPersonalLoanContract
            .connect(this.lender1Signer)
            .withdrawLockedInvestmentNfts(investmentId, numberOfPartitions);

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
            this.mockPersonalLoanContract
              .connect(this.lender1Signer)
              .withdrawLockedInvestmentNfts(
                this.projectId.add(1),
                numberOfPartitions
              ),
            'Not enough nfts to withdraw'
          );
        });

        it('Should revert when trying to withdraw locked tickets on non settled state', async function () {
          const numberOfPartitions = BigNumber.from(5);
          await expectRevert(
            this.mockPersonalLoanContract
              .connect(this.lender1Signer)
              .withdrawLockedInvestmentNfts(
                this.projectId,
                numberOfPartitions
              ),
            'Can withdraw only in Settled state'
          );
        });
      }
    );
  });
}
