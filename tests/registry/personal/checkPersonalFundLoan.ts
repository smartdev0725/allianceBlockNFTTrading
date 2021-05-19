import BN from 'bn.js';
import { expect } from 'chai';
import { LoanStatus } from '../../helpers/registryEnums';
import { getTransactionTimestamp } from "../../helpers/time";
import {BigNumber} from 'ethers';
import {deployments, ethers, getNamedAccounts} from "hardhat";

export default async function suite() {
  describe('Personal fund loan', async () => {

    it('when funding a loan', async function () {
      const initSeekerLendingBalance = await this.lendingTokenContract.balanceOf(this.seeker);
      let initEscrowLendingBalance = await this.lendingTokenContract.balanceOf(this.escrowContract.address);
      let initEscrowFundingNftBalance = await this.fundingNFTContract.balanceOf(this.escrowContract.address, this.loanId);
      let initLenderLendingBalance = await this.lendingTokenContract.balanceOf(this.lender1);
      let initLenderFundingNftBalance = await this.fundingNFTContract.balanceOf(this.lender1, this.loanId);

      let partitionsPurchased = BigNumber.from(0);

      await this.registryContract.connect(this.lender1Signer).fundLoan(this.loanId, this.smallPartition);

      let newEscrowLendingBalance = await this.lendingTokenContract.balanceOf(this.escrowContract.address);
      let newEscrowFundingNftBalance = await this.fundingNFTContract.balanceOf(this.escrowContract.address, this.loanId);
      let newLenderLendingBalance = await this.lendingTokenContract.balanceOf(this.lender1);
      let newLenderFundingNftBalance = await this.fundingNFTContract.balanceOf(this.lender1, this.loanId);

      partitionsPurchased = partitionsPurchased.add(this.smallPartition);

      let loanStatus = await this.registryContract.loanStatus(this.loanId);
      let loanDetails = await this.registryContract.loanDetails(this.loanId);

      // Correct Balances.
      expect(newEscrowLendingBalance.sub(initEscrowLendingBalance).toString()).to.be.equal(this.smallPartitionAmountToPurchase.toString());
      expect(initEscrowFundingNftBalance.sub(newEscrowFundingNftBalance).toString()).to.be.equal(this.smallPartition.toString());
      expect(initLenderLendingBalance.sub(newLenderLendingBalance).toString()).to.be.equal(this.smallPartitionAmountToPurchase.toString());
      expect(newLenderFundingNftBalance.sub(initLenderFundingNftBalance).toString()).to.be.equal(this.smallPartition.toString());

      // Correct Status.
      expect(loanStatus.toString()).to.be.equal(LoanStatus.FUNDING);

      // Correct Details.
      expect(loanDetails.partitionsPurchased.toString()).to.be.equal(partitionsPurchased.toString());

      initEscrowLendingBalance = newEscrowLendingBalance;
      initEscrowFundingNftBalance = newEscrowFundingNftBalance;
      initLenderLendingBalance = await this.lendingTokenContract.balanceOf(this.lender1);
      initLenderFundingNftBalance = await this.fundingNFTContract.balanceOf(this.lender1, this.loanId);

      await this.registryContract.connect(this.lender1Signer).fundLoan(this.loanId, this.smallPartition);

      newEscrowLendingBalance = await this.lendingTokenContract.balanceOf(this.escrowContract.address);
      newEscrowFundingNftBalance = await this.fundingNFTContract.balanceOf(this.escrowContract.address, this.loanId);
      newLenderLendingBalance = await this.lendingTokenContract.balanceOf(this.lender1);
      newLenderFundingNftBalance = await this.fundingNFTContract.balanceOf(this.lender1, this.loanId);

      partitionsPurchased = partitionsPurchased.add(this.smallPartition);

      loanStatus = await this.registryContract.loanStatus(this.loanId);
      loanDetails = await this.registryContract.loanDetails(this.loanId);

      // Correct Balances.
      expect(newEscrowLendingBalance.sub(initEscrowLendingBalance).toString()).to.be.equal(this.smallPartitionAmountToPurchase.toString());
      expect(initEscrowFundingNftBalance.sub(newEscrowFundingNftBalance).toString()).to.be.equal(this.smallPartition.toString());
      expect(initLenderLendingBalance.sub(newLenderLendingBalance).toString()).to.be.equal(this.smallPartitionAmountToPurchase.toString());
      expect(newLenderFundingNftBalance.sub(initLenderFundingNftBalance).toString()).to.be.equal(this.smallPartition.toString());

      // Correct Status.
      expect(loanStatus).to.be.equal(LoanStatus.FUNDING);

      // Correct Details.
      expect(loanDetails.partitionsPurchased.toString()).to.be.equal(partitionsPurchased.toString());

      initEscrowFundingNftBalance = newEscrowFundingNftBalance;
      initLenderLendingBalance = await this.lendingTokenContract.balanceOf(this.lender2);
      initLenderFundingNftBalance = await this.fundingNFTContract.balanceOf(this.lender2, this.loanId);

      const tx = await this.registryContract.connect(this.lender2Signer).fundLoan(this.loanId, this.bigPartition);

      const newSeekerLendingBalance = new BN(await this.lendingToken.balanceOf(this.seeker));

      newEscrowLendingBalance = await this.lendingTokenContract.balanceOf(this.escrowContract.address);
      newEscrowFundingNftBalance = await this.fundingNFTContract.balanceOf(this.escrowContract.address, this.loanId);
      newLenderLendingBalance = await this.lendingTokenContract.balanceOf(this.lender2);
      newLenderFundingNftBalance = await this.fundingNFTContract.balanceOf(this.lender2, this.loanId);

      partitionsPurchased = partitionsPurchased.add(this.bigPartition);

      loanStatus = await this.registryContract.loanStatus(this.loanId);
      loanDetails = await this.registryContract.loanDetails(this.loanId);
      const loanPayments = await this.registryContract.personalLoanPayments(this.loanId);

      // Correct Balances.
      expect(newEscrowLendingBalance.toString()).to.be.equal(this.startingEscrowLendingBalance.toString());
      expect(initEscrowFundingNftBalance.sub(newEscrowFundingNftBalance).toString()).to.be.equal(this.bigPartition.toString());
      expect(initLenderLendingBalance.sub(newLenderLendingBalance).toString()).to.be.equal(this.bigPartitionAmountToPurchase.toString());
      expect(newLenderFundingNftBalance.sub(initLenderFundingNftBalance).toString()).to.be.equal(this.bigPartition.toString());
      expect(newSeekerLendingBalance.sub(initSeekerLendingBalance).toString()).to.be.equal(loanDetails.lendingAmount.toString());

      // Correct Status.
      expect(loanStatus.toString()).to.be.equal(LoanStatus.STARTED);

      // Correct Details.
      expect(loanDetails.partitionsPurchased.toString()).to.be.equal(partitionsPurchased.toString());
      expect(loanDetails.totalPartitions.toString()).to.be.equal(partitionsPurchased.toString());
      expect(loanDetails.startingDate.toString()).to.be.equal((await getTransactionTimestamp(tx.tx)).toString());

      // Correct Payments.
      expect(loanPayments.batchStartingTimestamp.toString()).to.be.equal((await getTransactionTimestamp(tx.tx)).toString());
      expect(loanPayments.batchDeadlineTimestamp.toString()).to.be.equal(
        (await getTransactionTimestamp(tx.tx)).add(this.batchTimeInterval).toString());
    });
  });
}
