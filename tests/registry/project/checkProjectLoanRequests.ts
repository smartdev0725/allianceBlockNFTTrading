import BN from 'bn.js';
import {expect} from 'chai';
import {LoanType, LoanStatus} from '../../helpers/registryEnums';
import {ONE_DAY, BASE_AMOUNT, DAO_LOAN_APPROVAL} from '../../helpers/constants';
import {getTransactionTimestamp, getCurrentTimestamp} from '../../helpers/time';
const {expectEvent} = require('@openzeppelin/test-helpers');
import {deployments, ethers, getNamedAccounts} from 'hardhat';
import {BigNumber} from 'ethers';

export default async function suite() {
  describe('Check project loan request', async () => {

    it('when requesting an project loan', async function () {
      const loanId = await this.registryContract.totalLoans();
      const approvalRequest = await this.governanceContract.totalApprovalRequests();
      const initSeekerCollateralBalance = await this.projectTokenContract.balanceOf(
        this.deployer
      );
      const initEscrowCollateralBalance = await this.projectTokenContract.balanceOf(
        this.escrowContract.address
      );
      const initEscrowFundingNftBalance = await this.fundingNFTContract.balanceOf(
        this.escrowContract.address,
        loanId
      );

      const amountCollateralized = ethers.utils.parseEther('100000');
      const projectTokenPrice = BigNumber.from(1);
      const interestPercentage = BigNumber.from(20);
      const discountPerMillion = BigNumber.from(300000);
      const totalMilestones = BigNumber.from(3);
      const tokenId = BigNumber.from(
        new BN(totalMilestones.sub(BigNumber.from(1)).toString())
          .ishln(128)
          .or(new BN(loanId.toNumber()))
          .toString()
      ); // Project tokens are minted with the generation at totalMilestons - 1 so they can initially only be used after all milestones were delivered.
      const paymentTimeInterval = BigNumber.from(3600);
      const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

      const milestoneDurations = new Array<BigNumber>(totalMilestones);
      const amountRequestedPerMilestone = new Array<BigNumber>(totalMilestones);
      const currentTime = await getCurrentTimestamp();

      for (let i = 0; i < Number(totalMilestones); i++) {
        milestoneDurations[i] = BigNumber.from(
          currentTime.add(new BN((i + 1) * ONE_DAY)).toString()
        );
        amountRequestedPerMilestone[i] = ethers.utils.parseEther('10000');
      }

      const tx = await this.registryContract
        .connect(this.deployerSigner)
        .requestProjectLoan(
          amountRequestedPerMilestone,
          this.projectTokenContract.address,
          amountCollateralized,
          projectTokenPrice,
          interestPercentage,
          discountPerMillion,
          totalMilestones,
          milestoneDurations,
          paymentTimeInterval,
          ipfsHash
        );

      const totalAmountRequested =
        amountRequestedPerMilestone[0].mul(totalMilestones);
      const totalPartitions = totalAmountRequested.div(
        ethers.utils.parseEther(BASE_AMOUNT + '')
      );
      const totalInterest = totalAmountRequested
        .mul(interestPercentage)
        .div(BigNumber.from(100));

      const newSeekerCollateralBalance = await this.projectTokenContract.balanceOf(
        this.deployer
      );
      const newEscrowCollateralBalance = await this.projectTokenContract.balanceOf(
        this.escrowContract.address
      );
      const newEscrowFundingNftBalance = await this.fundingNFTContract.balanceOf(
        this.escrowContract.address,
        tokenId
      );

      const isPaused = await this.fundingNFTContract.transfersPaused(loanId);

      const loanStatus = await this.registryContract.loanStatus(loanId);
      const loanDetails = await this.registryContract.loanDetails(loanId);
      const loanPayments = await this.registryContract.projectLoanPayments(loanId);
      const daoApprovalRequest = await this.governanceContract.approvalRequests(
        approvalRequest
      );

      // Correct Status.
      expect(loanStatus.toString()).to.be.equal(LoanStatus.REQUESTED);

      // Correct Event.
      expectEvent(tx.receipt, 'ProjectLoanRequested', {
        loanId,
        user: this.deployer,
        amount: totalAmountRequested.toString(),
      });

      // Correct Details.
      expect(loanDetails.loanId.toNumber()).to.be.equal(loanId.toNumber());
      expect(loanDetails.loanType.toString()).to.be.equal(LoanType.PROJECT);
      expect(loanDetails.startingDate.toNumber()).to.be.equal(0);
      expect(loanDetails.collateralToken).to.be.equal(
        this.projectTokenContract.address
      );
      expect(loanDetails.collateralAmount.toNumber()).to.be.equal(
        amountCollateralized
      );
      expect(loanDetails.lendingAmount.toNumber()).to.be.equal(
        totalAmountRequested
      );
      expect(loanDetails.totalPartitions.toNumber()).to.be.equal(
        totalPartitions.toNumber()
      );
      expect(loanDetails.totalInterest.toNumber()).to.be.equal(
        totalInterest.toNumber()
      );
      expect(loanDetails.extraInfo).to.be.equal(ipfsHash);
      expect(loanDetails.partitionsPurchased.toNumber()).to.be.equal(0);

      // Correct Payments.
      expect(loanPayments.totalMilestones.toNumber()).to.be.equal(
        totalMilestones.toNumber()
      );
      expect(loanPayments.milestonesDelivered.toNumber()).to.be.equal(0);
      expect(loanPayments.milestonesExtended.toNumber()).to.be.equal(0);
      expect(loanPayments.paymentTimeInterval.toNumber()).to.be.equal(
        paymentTimeInterval.toNumber()
      );
      expect(
        loanPayments.currentMilestoneStartingTimestamp.toNumber()
      ).to.be.equal(0);
      expect(
        loanPayments.currentMilestoneDeadlineTimestamp.toNumber()
      ).to.be.equal(0);

      const amountToBeRepaidLoanId = await this.registryContract.getAmountToBeRepaid(
        loanId
      );
      expect(amountToBeRepaidLoanId.toNumber()).to.be.equal(
        totalAmountRequested.add(totalInterest).toNumber()
      );
      expect(loanPayments.discountPerMillion.toNumber()).to.be.equal(300000);
      for (const i in milestoneDurations) {
        const {amount, timestamp} = await this.registryContract.getMilestonesInfo(
          loanId,
          i
        );
        expect(amount.toNumber()).to.be.equal(
          amountRequestedPerMilestone[i].toNumber()
        );
        expect(timestamp.toNumber()).to.be.equal(
          milestoneDurations[i].toNumber()
        );
      }

      // Correct Balances.
      expect(
        initSeekerCollateralBalance.sub(newSeekerCollateralBalance).toNumber()
      ).to.be.equal(amountCollateralized.toNumber());
      expect(
        newEscrowCollateralBalance.sub(initEscrowCollateralBalance).toNumber()
      ).to.be.equal(amountCollateralized.toNumber());
      expect(
        newEscrowFundingNftBalance.sub(initEscrowFundingNftBalance).toNumber()
      ).to.be.equal(totalPartitions.toNumber());

      // Correct Nft Behavior.
      expect(isPaused).to.be.equal(true);

      // Correct Dao Request.
      expect(daoApprovalRequest.loanId.toNumber()).to.be.equal(loanId.toNumber());
      expect(daoApprovalRequest.isMilestone).to.be.equal(false);
      expect(daoApprovalRequest.milestoneNumber.toNumber()).to.be.equal(0);
      expect(daoApprovalRequest.deadlineTimestamp.toNumber()).to.be.equal(
        (await getTransactionTimestamp(tx.tx))
          .add(BigNumber.from(DAO_LOAN_APPROVAL))
          .toNumber()
      );
      expect(daoApprovalRequest.approvalsProvided.toNumber()).equal(0);
      expect(daoApprovalRequest.isApproved).to.be.equal(false);
    });
  });
}
