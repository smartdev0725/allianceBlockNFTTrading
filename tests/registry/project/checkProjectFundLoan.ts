import {expect} from 'chai';
import {LoanStatus} from '../../helpers/registryEnums';
import {getTransactionTimestamp} from '../../helpers/time';
import {ethers, deployments, getNamedAccounts} from 'hardhat';
import {BigNumber} from 'ethers';

export default async function suite() {
  describe('Check project fund loan', async () => {
    it('when funding a project loan', async function () {
      const initSeekerLendingBalance = await this.lendingTokenContract.balanceOf(this.seeker);
      let initEscrowLendingBalance = await this.lendingTokenContract.balanceOf(this.escrowContract.address);
      let initEscrowFundingNftBalance = await this.registryContract.balanceOfAllFundingNFTGenerations(this.loanId, this.escrowContract.address,);
      let initLenderLendingBalance = await this.lendingTokenContract.balanceOf(this.lender1);
      let initLenderFundingNftBalance = await this.registryContract.balanceOfAllFundingNFTGenerations(this.loanId, this.lender1,);
      let partitionsPurchased = BigNumber.from(0);

      await this.registryContract.connect(this.lender1Signer).fundLoan(this.loanId, this.smallPartition);

      let newEscrowLendingBalance = await this.lendingTokenContract.balanceOf(this.escrowContract.address);
      let newEscrowFundingNftBalance = await this.registryContract.balanceOfAllFundingNFTGenerations(this.loanId, this.escrowContract.address,);
      let newLenderLendingBalance = await this.lendingTokenContract.balanceOf(this.lender1);
      let newLenderFundingNftBalance = await this.registryContract.balanceOfAllFundingNFTGenerations(this.loanId, this.lender1,);

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
      expect(loanDetails.partitionsPurchased.toString()).to.be.equal(
        partitionsPurchased.toString()
      );

      initEscrowLendingBalance = newEscrowLendingBalance;
      initEscrowFundingNftBalance = newEscrowFundingNftBalance;
      initLenderLendingBalance = await this.lendingTokenContract.balanceOf(this.lender2);
      initLenderFundingNftBalance = await this.registryContract.balanceOfAllFundingNFTGenerations(this.loanId, this.lender2,);

      await this.registryContract.connect(this.lender2Signer).fundLoan(this.loanId, this.smallPartition);

      newEscrowLendingBalance = await this.lendingTokenContract.balanceOf(this.escrowContract.address);
      newEscrowFundingNftBalance = await this.registryContract.balanceOfAllFundingNFTGenerations(this.loanId, this.escrowContract.address,);
      newLenderLendingBalance = await this.lendingTokenContract.balanceOf(this.lender2);
      newLenderFundingNftBalance = await this.registryContract.balanceOfAllFundingNFTGenerations(this.loanId, this.lender2,);

      partitionsPurchased = partitionsPurchased.add(this.smallPartition);

      loanStatus = await this.registryContract.loanStatus(this.loanId);
      loanDetails = await this.registryContract.loanDetails(this.loanId);

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
      initLenderLendingBalance = await this.lendingTokenContract.balanceOf(this.lender3);
      initLenderFundingNftBalance = await this.registryContract.balanceOfAllFundingNFTGenerations(this.loanId, this.lender3,);

      const tx = await this.registryContract
        .connect(this.lender3Signer)
        .fundLoan(this.loanId, this.bigPartition);

      const newSeekerLendingBalance = await this.lendingTokenContract.balanceOf(this.seeker);

      newEscrowLendingBalance = await this.lendingTokenContract.balanceOf(this.escrowContract.address);
      newEscrowFundingNftBalance = await this.registryContract.balanceOfAllFundingNFTGenerations(this.loanId, this.escrowContract.address,);
      newLenderLendingBalance = await this.lendingTokenContract.balanceOf(this.lender3);
      newLenderFundingNftBalance = await this.registryContract.balanceOfAllFundingNFTGenerations(this.loanId, this.lender3,);

      partitionsPurchased = partitionsPurchased.add(this.bigPartition);

      loanStatus = await this.registryContract.loanStatus(this.loanId);
      loanDetails = await this.registryContract.loanDetails(this.loanId);
      const loanPayments = await this.registryContract.projectLoanPayments(
        this.loanId
      );

      // Correct Balances.
      expect(newEscrowLendingBalance.toString()).to.be.equal(
        initEscrowLendingBalance.add(this.bigPartitionAmountToPurchase).sub(this.amountRequestedPerMilestone[0]).toString());
      expect(
        initEscrowFundingNftBalance.sub(newEscrowFundingNftBalance).toString()
      ).to.be.equal(this.bigPartition.toString());
      expect(
        initLenderLendingBalance.sub(newLenderLendingBalance).toString()
      ).to.be.equal(this.bigPartitionAmountToPurchase.toString());
      expect(
        newLenderFundingNftBalance.sub(initLenderFundingNftBalance).toString()
      ).to.be.equal(this.bigPartition.toString());
      expect(
        initSeekerLendingBalance.add(this.amountRequestedPerMilestone[0]).toString()
      ).to.be.equal(newSeekerLendingBalance.toString());

      // Correct Status.
      expect(loanStatus.toString()).to.be.equal(LoanStatus.STARTED);

      // Correct Details.
      expect(loanDetails.partitionsPurchased.toString()).to.be.equal(
        partitionsPurchased.toString()
      );
      expect(loanDetails.totalPartitions.toString()).to.be.equal(
        partitionsPurchased.toString()
      );
      expect(loanDetails.startingDate.toString()).to.be.equal(
        (await getTransactionTimestamp(tx.hash)).toString()
      );

      // Correct Payments.
      expect(loanPayments.currentMilestoneStartingTimestamp.toString()).to.be.equal(
        (await getTransactionTimestamp(tx.hash)).toString()
      );
      expect(loanPayments.currentMilestoneDeadlineTimestamp.toString()).to.be.equal(
        (await getTransactionTimestamp(tx.hash))
          .add(this.milestoneDurations[0])
          .toString()
      );
    });
  });
}
