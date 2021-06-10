import BN from 'bn.js';
import { LoanType, LoanStatus } from '../../helpers/registryEnums';
import { BASE_AMOUNT } from '../../helpers/constants';
import { ethers } from 'hardhat';
import { BigNumber } from 'ethers';
import chai, { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { StakingType } from '../../helpers/registryEnums';
const { expectRevert } = require('@openzeppelin/test-helpers');

chai.use(solidity);

export default async function suite() {
  describe.only('Show investment interest', async () => {
    it('reverts when investment is not approved yet', async function () {
      const loanId = await this.registryContract.totalLoans();
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

      await expectRevert(this.registryContract.connect(this.lender1Signer).showInterestForInvestment(loanId, 2), "Can show interest only in Approved state");
    });

    it('reverts when showing interest for 0 partitions', async function () {
      await expectRevert(this.registryContract.connect(this.lender1Signer).showInterestForInvestment(this.loanId, 0), "Cannot show interest for 0 partitions");
    });

    it('should revert when sender has no reputational ALBT yet', async function () {
      await expectRevert(this.registryContract.connect(this.lender1Signer).showInterestForInvestment(this.loanId, BigNumber.from(5)), "Not elegible for lottery numbers");
    });

    it('sends lending token for the purchased amount of partitions to escrow', async function () {
      // Given
      const numberOfPartitions = BigNumber.from(3);
      const amountOfLendingTokens = numberOfPartitions.mul(ethers.utils.parseEther(BASE_AMOUNT + ''));
      const initLenderLendingTokenBalance =
        await this.lendingTokenContract.balanceOf(this.lender1);
      const initEscrowLendingTokenBalance =
        await this.lendingTokenContract.balanceOf(this.escrowContract.address);

      // When
      await this.stakingContract
        .connect(this.lender1Signer)
        .stake(StakingType.STAKER_LVL_1);
      await this.registryContract.connect(this.lender1Signer).showInterestForInvestment(this.loanId, numberOfPartitions);

      // Then
      const lenderLendingTokenBalanceAfter =
        await this.lendingTokenContract.balanceOf(this.lender1);
      const escrowLendingTokenBalanceAfter =
        await this.lendingTokenContract.balanceOf(this.escrowContract.address);

      expect(lenderLendingTokenBalanceAfter).to.be.equal(initLenderLendingTokenBalance.sub(amountOfLendingTokens));
      expect(escrowLendingTokenBalanceAfter).to.be.equal(initEscrowLendingTokenBalance.add(amountOfLendingTokens));
    });

    it('increments the number of purchased partitions', async function () {
      // Given
      const numberOfPartitions = BigNumber.from(5);
      const loanDetailsBefore = await this.registryContract.loanDetails(this.loanId);
      const partitionsPurchasedBefore = loanDetailsBefore.partitionsPurchased;

      // When
      await this.stakingContract
        .connect(this.lender1Signer)
        .stake(StakingType.STAKER_LVL_1);
      await this.registryContract.connect(this.lender1Signer).showInterestForInvestment(this.loanId, numberOfPartitions);

      // Then
      const loanDetailsAfter = await this.registryContract.loanDetails(this.loanId);
      const partitionsPurchasedAfter = loanDetailsAfter.partitionsPurchased;
      expect(partitionsPurchasedAfter).to.be.equal(partitionsPurchasedBefore.add(numberOfPartitions));
    });

    it('should give tickets for reputational ALBT', async function () {
      // Given
      console.log("BEFORE SHOWING INTEREST")
      const numberOfPartitions = BigNumber.from(5);
      const ticketsRemainingBefore = await this.registryContract.ticketsRemaining(this.loanId);
      const totalLotteryNumbersPerInvestmentBefore = await this.registryContract.totalLotteryNumbersPerInvestment(this.loanId);
      const remainingTicketsPerAddressBefore = await this.registryContract.remainingTicketsPerAddress(this.loanId, this.lender1);
      const ticketsWonPerAddressBefore = await this.registryContract.ticketsWonPerAddress(this.loanId, this.lender1);

      console.log("ticketsRemainingBefore", ticketsRemainingBefore.toString());
      console.log("totalLotteryNumbersPerInvestmentBefore", totalLotteryNumbersPerInvestmentBefore.toString());
      console.log("remainingTicketsPerAddressBefore", remainingTicketsPerAddressBefore.toString());
      console.log("ticketsWonPerAddressBefore", ticketsWonPerAddressBefore.toString());

      // When
      // Stake first to get rALBT
      console.log("STAKING AND SHOWING INTEREST...")
      await this.stakingContract
        .connect(this.lender1Signer)
        .stake(StakingType.STAKER_LVL_2);
      await this.registryContract.connect(this.lender1Signer).showInterestForInvestment(this.loanId, numberOfPartitions);

      // Then
      console.log("AFTER SHOWING INTEREST")
      const ticketsRemainingAfter = await this.registryContract.ticketsRemaining(this.loanId);
      const totalLotteryNumbersPerInvestmentAfter = await this.registryContract.totalLotteryNumbersPerInvestment(this.loanId);
      const remainingTicketsPerAddressAfter = await this.registryContract.remainingTicketsPerAddress(this.loanId, this.lender1);
      const ticketsWonPerAddressAfter = await this.registryContract.ticketsWonPerAddress(this.loanId, this.lender1);

      console.log("ticketsRemainingAfter", ticketsRemainingAfter.toString());
      console.log("totalLotteryNumbersPerInvestmentAfter", totalLotteryNumbersPerInvestmentAfter.toString());
      console.log("remainingTicketsPerAddressAfter", remainingTicketsPerAddressAfter.toString());
      console.log("ticketsWonPerAddressAfter", ticketsWonPerAddressAfter.toString());

      // TODO: expect
    });
  });
}
