import BN from 'bn.js';
import { toWei } from 'web3-utils';
import { expect } from 'chai';
import { RepaymentBatchType, LoanType, LoanStatus } from '../../helpers/registryEnums';
import { ONE_DAY, BASE_AMOUNT, DAO_LOAN_APPROVAL } from "../../helpers/constants";
import { getTransactionTimestamp, getCurrentTimestamp } from "../../helpers/time";

export default async function suite() {
  describe('Succeeds', async () => {
    const totalMilestones = new BN(3);
    let loanId: BN;
    let totalPartitions: BN;
    let bigPartition: BN;
    let smallPartition: BN;
    let bigPartitionAmountToPurchase: BN;
    let smallPartitionAmountToPurchase: BN;
    let startingEscrowLendingBalance: BN;
    let amountRequestedPerMilestone = new Array<BN>(totalMilestones);
    let milestoneDurations = new Array<BN>(totalMilestones);

    beforeEach(async function () {
      loanId = new BN(await this.registry.totalLoans());
      const approvalRequest = new BN(await this.governance.totalApprovalRequests());
      startingEscrowLendingBalance = new BN(await this.lendingToken.balanceOf(this.escrow.address));

      const amountCollateralized = new BN(toWei('100000'));
      const projectTokenPrice = new BN("1");
      const interestPercentage = new BN(20);
      const discountPerMillion = new BN(400000);
      const paymentTimeInterval = new BN(3600);
      const ipfsHash = "QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ"

      const currentTime = await getCurrentTimestamp();

      for (let i = 0; i < Number(totalMilestones); i++) {
        milestoneDurations[i] = currentTime.add(new BN((i + 1) * ONE_DAY))
        amountRequestedPerMilestone[i] = new BN(toWei('10000'));
      }

      await this.registry.requestProjectLoan(
        amountRequestedPerMilestone,
        this.projectToken.address,
        amountCollateralized.toString(),
        projectTokenPrice,
        interestPercentage,
        discountPerMillion,
        totalMilestones,
        milestoneDurations,
        paymentTimeInterval,
        ipfsHash,
        { from: this.projectOwner }
      );

      const totalAmountRequested = amountRequestedPerMilestone[0].mul(totalMilestones);
      totalPartitions = totalAmountRequested.div(new BN(toWei(BASE_AMOUNT.toString())));
      bigPartition = totalPartitions.div(new BN(2));
      smallPartition = bigPartition.div(new BN(2));
      bigPartitionAmountToPurchase = bigPartition.mul(new BN(toWei(BASE_AMOUNT.toString())));
      smallPartitionAmountToPurchase = smallPartition.mul(new BN(toWei(BASE_AMOUNT.toString())));

      await this.governance.voteForRequest(approvalRequest, true, { from: this.delegators[0] });
      await this.governance.voteForRequest(approvalRequest, true, { from: this.delegators[1] });
    });

    it('when funding a project loan', async function () {
      const initSeekerLendingBalance = new BN(await this.lendingToken.balanceOf(this.projectOwner));
      let initEscrowLendingBalance = new BN(await this.lendingToken.balanceOf(this.escrow.address));
      let initEscrowFundingNftBalance = new BN(await this.registry.balanceOfAllFundingNFTGenerations(loanId, this.escrow.address));
      let initLenderLendingBalance = new BN(await this.lendingToken.balanceOf(this.lenders[0]));
      let initLenderFundingNftBalance = new BN(await this.registry.balanceOfAllFundingNFTGenerations(loanId, this.lenders[0]));

      let partitionsPurchased = new BN(0);

      await this.registry.fundLoan(loanId, smallPartition, { from: this.lenders[0] });

      let newEscrowLendingBalance = new BN(await this.lendingToken.balanceOf(this.escrow.address));
      let newEscrowFundingNftBalance = new BN(await this.registry.balanceOfAllFundingNFTGenerations(loanId, this.escrow.address));
      let newLenderLendingBalance = new BN(await this.lendingToken.balanceOf(this.lenders[0]));
      let newLenderFundingNftBalance = new BN(await this.registry.balanceOfAllFundingNFTGenerations(loanId, this.lenders[0]));

      partitionsPurchased = partitionsPurchased.add(smallPartition);

      let loanStatus = await this.registry.loanStatus(loanId);
      let loanDetails = await this.registry.loanDetails(loanId);

      // Correct Balances.
      expect(newEscrowLendingBalance.sub(initEscrowLendingBalance)).to.be.bignumber.equal(smallPartitionAmountToPurchase);
      expect(initEscrowFundingNftBalance.sub(newEscrowFundingNftBalance)).to.be.bignumber.equal(smallPartition);
      expect(initLenderLendingBalance.sub(newLenderLendingBalance)).to.be.bignumber.equal(smallPartitionAmountToPurchase);
      expect(newLenderFundingNftBalance.sub(initLenderFundingNftBalance)).to.be.bignumber.equal(smallPartition);

      // Correct Status.
      expect(loanStatus).to.be.bignumber.equal(LoanStatus.FUNDING);

      // Correct Details.
      expect(loanDetails.partitionsPurchased).to.be.bignumber.equal(partitionsPurchased);

      initEscrowLendingBalance = newEscrowLendingBalance;
      initEscrowFundingNftBalance = newEscrowFundingNftBalance;
      initLenderLendingBalance = new BN(await this.lendingToken.balanceOf(this.lenders[1]));
      initLenderFundingNftBalance = new BN(await this.registry.balanceOfAllFundingNFTGenerations(loanId, this.lenders[1]));

      await this.registry.fundLoan(loanId, smallPartition, { from: this.lenders[1] });

      newEscrowLendingBalance = new BN(await this.lendingToken.balanceOf(this.escrow.address));
      newEscrowFundingNftBalance = new BN(await this.registry.balanceOfAllFundingNFTGenerations(loanId, this.escrow.address));
      newLenderLendingBalance = new BN(await this.lendingToken.balanceOf(this.lenders[1]));
      newLenderFundingNftBalance = new BN(await this.registry.balanceOfAllFundingNFTGenerations(loanId, this.lenders[1]));

      partitionsPurchased = partitionsPurchased.add(smallPartition);

      loanStatus = await this.registry.loanStatus(loanId);
      loanDetails = await this.registry.loanDetails(loanId);

      // Correct Balances.
      expect(newEscrowLendingBalance.sub(initEscrowLendingBalance)).to.be.bignumber.equal(smallPartitionAmountToPurchase);
      expect(initEscrowFundingNftBalance.sub(newEscrowFundingNftBalance)).to.be.bignumber.equal(smallPartition);
      expect(initLenderLendingBalance.sub(newLenderLendingBalance)).to.be.bignumber.equal(smallPartitionAmountToPurchase);
      expect(newLenderFundingNftBalance.sub(initLenderFundingNftBalance)).to.be.bignumber.equal(smallPartition);

      // Correct Status.
      expect(loanStatus).to.be.bignumber.equal(LoanStatus.FUNDING);

      // Correct Details.
      expect(loanDetails.partitionsPurchased).to.be.bignumber.equal(partitionsPurchased);

      initEscrowLendingBalance = newEscrowLendingBalance;
      initEscrowFundingNftBalance = newEscrowFundingNftBalance;
      initLenderLendingBalance = new BN(await this.lendingToken.balanceOf(this.lenders[2]));
      initLenderFundingNftBalance = new BN(await this.registry.balanceOfAllFundingNFTGenerations(loanId, this.lenders[2]));

      const tx = await this.registry.fundLoan(loanId, bigPartition, { from: this.lenders[2] });

      const newSeekerLendingBalance = new BN(await this.lendingToken.balanceOf(this.projectOwner));

      newEscrowLendingBalance = new BN(await this.lendingToken.balanceOf(this.escrow.address));
      newEscrowFundingNftBalance = new BN(await this.registry.balanceOfAllFundingNFTGenerations(loanId, this.escrow.address));
      newLenderLendingBalance = new BN(await this.lendingToken.balanceOf(this.lenders[2]));
      newLenderFundingNftBalance = new BN(await this.registry.balanceOfAllFundingNFTGenerations(loanId, this.lenders[2]));

      partitionsPurchased = partitionsPurchased.add(bigPartition);

      loanStatus = await this.registry.loanStatus(loanId);
      loanDetails = await this.registry.loanDetails(loanId);
      const loanPayments = await this.registry.projectLoanPayments(loanId);

      // Correct Balances.
      expect(newEscrowLendingBalance).to.be.bignumber.equal(initEscrowLendingBalance.add(bigPartitionAmountToPurchase).sub(amountRequestedPerMilestone[0])); // Lending amount for the first milestone is release to the project owner
      expect(initEscrowFundingNftBalance.sub(newEscrowFundingNftBalance)).to.be.bignumber.equal(bigPartition);
      expect(initLenderLendingBalance.sub(newLenderLendingBalance)).to.be.bignumber.equal(bigPartitionAmountToPurchase);
      expect(newLenderFundingNftBalance.sub(initLenderFundingNftBalance)).to.be.bignumber.equal(bigPartition);
      expect(initSeekerLendingBalance.add(amountRequestedPerMilestone[0])).to.be.bignumber.equal(newSeekerLendingBalance);

      // Correct Status.
      expect(loanStatus).to.be.bignumber.equal(LoanStatus.STARTED);

      // Correct Details.
      expect(loanDetails.partitionsPurchased).to.be.bignumber.equal(partitionsPurchased);
      expect(loanDetails.totalPartitions).to.be.bignumber.equal(partitionsPurchased);
      expect(loanDetails.startingDate).to.be.bignumber.equal(await getTransactionTimestamp(tx.tx));

      // Correct Payments.
      expect(loanPayments.currentMilestoneStartingTimestamp).to.be.bignumber.equal(await getTransactionTimestamp(tx.tx));
      expect(loanPayments.currentMilestoneDeadlineTimestamp).to.be.bignumber.equal(
        (await getTransactionTimestamp(tx.tx)).add(milestoneDurations[0]));
    });
  });
}
