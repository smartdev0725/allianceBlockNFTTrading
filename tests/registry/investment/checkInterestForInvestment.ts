import {BASE_AMOUNT} from '../../helpers/constants';
import {ethers} from 'hardhat';
import {BigNumber} from 'ethers';
import chai, {expect} from 'chai';
import {solidity} from 'ethereum-waffle';
import {StakingType, InvestmentStatus} from '../../helpers/registryEnums';
const {expectRevert} = require('@openzeppelin/test-helpers');

chai.use(solidity);

export default async function suite() {
  describe('Show investment interest', async () => {
    it('reverts when investment is not approved yet', async function () {
      const investmentId = await this.registryContract.totalInvestments();
      const amountOfTokensToBePurchased = ethers.utils.parseEther('100000');
      const totalAmountRequested = ethers.utils.parseEther('30000');
      const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

      await this.registryContract
        .connect(this.seekerSigner)
        .requestInvestment(
          this.investmentTokenContract.address,
          amountOfTokensToBePurchased,
          totalAmountRequested,
          ipfsHash
        );

      await expectRevert(
        this.registryContract
          .connect(this.lender1Signer)
          .showInterestForInvestment(investmentId, 2),
        'Can show interest only in Approved state'
      );
    });

    it('reverts when showing interest for 0 partitions', async function () {
      await expectRevert(
        this.registryContract
          .connect(this.lender1Signer)
          .showInterestForInvestment(this.investmentId, 0),
        'Cannot show interest for 0 partitions'
      );
    });

    it('reverts when trying to decideForInvestment externally', async function () {
      await expectRevert(
        this.registryContract
          .connect(this.lender1Signer)
          .decideForInvestment(this.investmentId, true),
        'Only Governance'
      );
    });

    it('should revert when sender has no reputational ALBT yet', async function () {
      await expectRevert(
        this.registryContract
          .connect(this.lender1Signer)
          .showInterestForInvestment(this.investmentId, BigNumber.from(5)),
        'Not eligible for lottery numbers'
      );
    });

    it('sends lending token for the purchased amount of partitions to escrow', async function () {
      // Given
      const numberOfPartitions = BigNumber.from(3);
      const amountOfLendingTokens = numberOfPartitions.mul(
        ethers.utils.parseEther(BASE_AMOUNT + '')
      );
      const initLenderLendingTokenBalance =
        await this.lendingTokenContract.balanceOf(this.lender1);
      const initEscrowLendingTokenBalance =
        await this.lendingTokenContract.balanceOf(this.escrowContract.address);

      // When

      // the user needs to have rALBT to show interest, rALBT can be obtained by making stake, but there are also other ways to do it (it is not necessary to make stake at all)
      await this.stakingContract
        .connect(this.lender1Signer)
        .stake(StakingType.STAKER_LVL_1);

      await this.registryContract
        .connect(this.lender1Signer)
        .showInterestForInvestment(this.investmentId, numberOfPartitions);

      // Then
      const lenderLendingTokenBalanceAfter =
        await this.lendingTokenContract.balanceOf(this.lender1);
      const escrowLendingTokenBalanceAfter =
        await this.lendingTokenContract.balanceOf(this.escrowContract.address);

      expect(lenderLendingTokenBalanceAfter).to.be.equal(
        initLenderLendingTokenBalance.sub(amountOfLendingTokens)
      );
      expect(escrowLendingTokenBalanceAfter).to.be.equal(
        initEscrowLendingTokenBalance.add(amountOfLendingTokens)
      );
    });

    it('increments the number of purchased partitions', async function () {
      // Given
      const numberOfPartitions = BigNumber.from(5);
      const investmentDetailsBefore = await this.registryContract.investmentDetails(
        this.investmentId
      );
      const partitionsRequestedBefore = investmentDetailsBefore.partitionsRequested;

      // When
      await this.stakingContract
        .connect(this.lender1Signer)
        .stake(StakingType.STAKER_LVL_1);
      await this.registryContract
        .connect(this.lender1Signer)
        .showInterestForInvestment(this.investmentId, numberOfPartitions);

      // Then
      const investmentDetailsAfter = await this.registryContract.investmentDetails(
        this.investmentId
      );
      const partitionsRequestedAfter = investmentDetailsAfter.partitionsRequested;
      expect(partitionsRequestedAfter).to.be.equal(
        partitionsRequestedBefore.add(numberOfPartitions)
      );
    });

    it('when showing interest two times', async function () {
      // Given
      const numberOfPartitions = BigNumber.from(5);

      // When
      await this.stakingContract
        .connect(this.lender1Signer)
        .stake(StakingType.STAKER_LVL_1);
      await this.registryContract
        .connect(this.lender1Signer)
        .showInterestForInvestment(this.investmentId, numberOfPartitions);

      const investmentDetailsBefore = await this.registryContract.investmentDetails(
        this.investmentId
      );
      const partitionsRequestedBefore = investmentDetailsBefore.partitionsRequested;

      await this.registryContract
        .connect(this.lender1Signer)
        .showInterestForInvestment(this.investmentId, numberOfPartitions);

      // Then
      const investmentDetailsAfter = await this.registryContract.investmentDetails(
        this.investmentId
      );
      const partitionsRequestedAfter = investmentDetailsAfter.partitionsRequested;
      expect(partitionsRequestedAfter).to.be.equal(
        partitionsRequestedBefore.add(numberOfPartitions)
      );
    });

    it('when showing interest and is eligible for immediate tickets', async function () {
      // Given
      const numberOfPartitions = BigNumber.from(3);

      // When
      await this.stakingContract
        .connect(this.lender1Signer)
        .stake(StakingType.STAKER_LVL_3);

      const ticketsRemainingBefore = await this.registryContract.ticketsRemaining(this.investmentId);

      await this.registryContract
        .connect(this.lender1Signer)
        .showInterestForInvestment(this.investmentId, numberOfPartitions);

      // Then
      const ticketsRemainingAfter = await this.registryContract.ticketsRemaining(this.investmentId);
      const ticketsWon = await this.registryContract.ticketsWonPerAddress(this.investmentId, this.lender1);
      expect(ticketsWon.toString()).to.be.equal(
        '2'
      );
      expect(ticketsRemainingBefore.sub(ticketsRemainingAfter).toString()).to.be.equal(
        '2'
      );
    });

    it('when showing interest but applying for less tickets than immediate tickets eligible', async function () {
      // Given
      const numberOfPartitions = BigNumber.from(1);

      // When
      await this.stakingContract
        .connect(this.lender1Signer)
        .stake(StakingType.STAKER_LVL_3);

      const ticketsRemainingBefore = await this.registryContract.ticketsRemaining(this.investmentId);

      await this.registryContract
        .connect(this.lender1Signer)
        .showInterestForInvestment(this.investmentId, numberOfPartitions);

      // Then
      const ticketsRemainingAfter = await this.registryContract.ticketsRemaining(this.investmentId);
      const ticketsWon = await this.registryContract.ticketsWonPerAddress(this.investmentId, this.lender1);
      expect(ticketsWon.toString()).to.be.equal(
        '1'
      );
      expect(ticketsRemainingBefore.sub(ticketsRemainingAfter).toString()).to.be.equal(
        '1'
      );
    });

    it('should give tickets for reputational ALBT', async function () {
      // Given
      const numberOfPartitions = BigNumber.from(5);
      const ticketsRemainingBefore =
        await this.registryContract.ticketsRemaining(this.investmentId);
      const totalLotteryNumbersPerInvestmentBefore =
        await this.registryContract.totalLotteryNumbersPerInvestment(
          this.investmentId
        );
      const remainingTicketsPerAddressBefore =
        await this.registryContract.remainingTicketsPerAddress(
          this.investmentId,
          this.lender1
        );
      const ticketsWonPerAddressBefore =
        await this.registryContract.ticketsWonPerAddress(
          this.investmentId,
          this.lender1
        );
      // Check investment data before showing interest
      expect(ticketsRemainingBefore).to.be.equal(
        this.totalAmountRequested.div(
          ethers.utils.parseEther(BASE_AMOUNT.toString())
        )
      );
      expect(totalLotteryNumbersPerInvestmentBefore).to.be.equal(
        BigNumber.from(0)
      );
      expect(remainingTicketsPerAddressBefore).to.be.equal(BigNumber.from(0));
      expect(ticketsWonPerAddressBefore).to.be.equal(BigNumber.from(0));

      // When
      // Stake first to get rALBT
      await this.stakingContract
        .connect(this.lender1Signer)
        .stake(StakingType.STAKER_LVL_1);
      await this.registryContract
        .connect(this.lender1Signer)
        .showInterestForInvestment(this.investmentId, numberOfPartitions);

      // Then
      const ticketsRemainingAfter =
        await this.registryContract.ticketsRemaining(this.investmentId);
      const totalLotteryNumbersPerInvestmentAfter =
        await this.registryContract.totalLotteryNumbersPerInvestment(
          this.investmentId
        );
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

      // No immediate tickets are given for staking only level 1
      expect(ticketsRemainingAfter).to.be.equal(ticketsRemainingBefore);
      expect(totalLotteryNumbersPerInvestmentAfter).to.be.equal(
        BigNumber.from(1)
      );
      expect(remainingTicketsPerAddressAfter).to.be.equal(
        numberOfPartitions.sub(
          ticketsRemainingBefore.sub(ticketsRemainingAfter)
        )
      );
      expect(ticketsWonPerAddressAfter).to.be.equal(BigNumber.from(0));
    });

    it('when all tickets are provided as immediate (no lottery)', async function () {
      // Given
      this.amountOfTokensToBePurchased = ethers.utils.parseEther('80');
      this.totalAmountRequested = ethers.utils.parseEther('40'); // Only 4 tickets
      this.ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

      await this.registryContract
        .connect(this.seekerSigner)
        .requestInvestment(
          this.investmentTokenContract.address,
          this.amountOfTokensToBePurchased,
          this.totalAmountRequested,
          this.ipfsHash
        );

      await this.governanceContract
        .connect(this.superDelegatorSigner)
        .superVoteForRequest(this.approvalRequest.add(1), true);

      // When
      await this.stakingContract
        .connect(this.lender1Signer)
        .stake(StakingType.STAKER_LVL_3);

      await this.stakingContract
        .connect(this.lender2Signer)
        .stake(StakingType.STAKER_LVL_3);

      const ticketsRemainingBefore = await this.registryContract.ticketsRemaining(this.investmentId.add(1));

      const numberOfPartitions = 3;

      await this.registryContract
        .connect(this.lender1Signer)
        .showInterestForInvestment(this.investmentId.add(1), numberOfPartitions);

      await this.registryContract
        .connect(this.lender2Signer)
        .showInterestForInvestment(this.investmentId.add(1), numberOfPartitions);

      // Then
      const ticketsRemainingAfter = await this.registryContract.ticketsRemaining(this.investmentId.add(1));
      const ticketsWonForLender1 = await this.registryContract.ticketsWonPerAddress(this.investmentId.add(1), this.lender1);
      const ticketsWonForLender2 = await this.registryContract.ticketsWonPerAddress(this.investmentId.add(1), this.lender2);
      const status = await this.registryContract.investmentStatus(this.investmentId.add(1));
      expect(ticketsWonForLender1.toString()).to.be.equal(
        '2'
      );
      expect(ticketsWonForLender2.toString()).to.be.equal(
        '2'
      );
      expect(ticketsRemainingBefore.sub(ticketsRemainingAfter).toString()).to.be.equal(
        '4'
      );
      expect(ticketsRemainingAfter.toString()).to.be.equal(
        '0'
      );
      expect(status.toString()).to.be.equal(
        InvestmentStatus.SETTLED
      );
    });
  });
}
