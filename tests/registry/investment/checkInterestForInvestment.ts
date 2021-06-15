import {BASE_AMOUNT} from '../../helpers/constants';
import {ethers} from 'hardhat';
import {BigNumber} from 'ethers';
import chai, {expect} from 'chai';
import {solidity} from 'ethereum-waffle';
import {StakingType} from '../../helpers/registryEnums';
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
          this.projectTokenContract.address,
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

    it('should revert when sender has no reputational ALBT yet', async function () {
      await expectRevert(
        this.registryContract
          .connect(this.lender1Signer)
          .showInterestForInvestment(this.investmentId, BigNumber.from(5)),
        'Not elegible for lottery numbers'
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
  });
}
