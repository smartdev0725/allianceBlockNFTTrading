import {expect} from 'chai';
import {LoanStatus} from '../../helpers/registryEnums';
import {increaseTime} from '../../helpers/time';
import {deployments, ethers, getNamedAccounts} from 'hardhat';
import {BigNumber} from 'ethers';
import {BASE_AMOUNT, ONE_DAY} from "../../helpers/constants";
const {expectRevert} = require('@openzeppelin/test-helpers');
import BN from 'bn.js';

export default async function suite() {
  describe('Project milestone repayment', async () => {
    let approvalRequest: BigNumber;

    beforeEach(async function () {

      this.approvalRequest = await this.governanceContract.totalApprovalRequests();
      this.loanId = await this.registryContract.totalLoans();
      this.totalMilestones = BigNumber.from(1);
      this.milestoneDurations = new Array<BigNumber>(this.totalMilestones);
      this.amountRequestedPerMilestone = new Array<BigNumber>(
        this.totalMilestones
      );
      for (let i = 0; i < Number(this.totalMilestones); i++) {
        this.milestoneDurations[i] = BigNumber.from(
          this.currentTime.add(new BN((i + 1) * ONE_DAY)).toString()
        );
        this.amountRequestedPerMilestone[i] = ethers.utils.parseEther('10000');
      }

      this.totalAmountRequested = this.amountRequestedPerMilestone[0].mul(
        this.totalMilestones
      );
      this.totalPartitions = this.totalAmountRequested.div(
        ethers.utils.parseEther(BASE_AMOUNT + '')
      );
      this.bigPartition = this.totalPartitions.div(BigNumber.from(2));
      this.smallPartition = this.bigPartition.div(BigNumber.from(2));
      this.bigPartitionAmountToPurchase = this.bigPartition.mul(
        ethers.utils.parseEther(BASE_AMOUNT + '')
      );
      this.smallPartitionAmountToPurchase = this.smallPartition.mul(
        ethers.utils.parseEther(BASE_AMOUNT + '')
      );

      await this.registryContract
        .connect(this.seekerSigner)
        .requestProjectLoan(
          this.amountRequestedPerMilestone,
          this.projectTokenContract.address,
          this.amountCollateralized,
          this.projectTokenPrice,
          this.interestPercentage,
          this.discountPerMillion,
          this.totalMilestones,
          this.milestoneDurations,
          this.paymentTimeInterval,
          this.ipfsHash
        );

      await this.governanceContract
        .connect(this.superDelegatorSigner)
        .superVoteForRequest(this.approvalRequest, true);

      await this.registryContract
        .connect(this.lender1Signer)
        .fundLoan(this.loanId, this.bigPartition);
      await this.registryContract
        .connect(this.lender2Signer)
        .fundLoan(this.loanId, this.bigPartition);

      approvalRequest = await this.governanceContract.totalApprovalRequests();
      await this.registryContract
        .connect(this.seekerSigner)
        .applyMilestone(this.loanId);

      await this.governanceContract
        .connect(this.superDelegatorSigner)
        .superVoteForRequest(approvalRequest, true);
    });

    it('when repaying a project loan', async function () {
      const loanPayments = await this.registryContract.projectLoanPayments(
        this.loanId
      );

      await this.lendingTokenContract.approve(
        this.registryContract.address,
        await this.registryContract
          .connect(this.seekerSigner)
          .getAmountToBeRepaid(this.loanId)
      );
      await this.registryContract
        .connect(this.seekerSigner)
        .executePayment(this.loanId);
      const loanStatus = await this.registryContract.loanStatus(this.loanId);

      // Correct Status.
      expect(loanStatus.toString()).to.be.equal(LoanStatus.SETTLED);
    });

    it('should revert when repaying a project loan out of time', async function () {
      // When
      const loanPayments = await this.registryContract.projectLoanPayments(
        this.loanId
      );

      // Move time to 1 month, so we can trigger the exception
      await increaseTime(this.deployerSigner.provider, 30 * 24 * 60 * 60); // One Month

      await this.lendingTokenContract
        .connect(this.seekerSigner)
        .approve(
          this.registryContract.address,
          await this.registryContract.getAmountToBeRepaid(this.loanId)
        );

      // Then
      await expectRevert(
        this.registryContract
          .connect(this.seekerSigner)
          .executePayment(this.loanId),
        'Only between awaiting for repayment timeframe'
      );
    });
  });
}
