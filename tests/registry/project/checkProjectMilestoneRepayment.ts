import {expect} from 'chai';
import {LoanStatus} from '../../helpers/registryEnums';
import {BASE_AMOUNT} from '../../helpers/constants';
import {increaseTime} from '../../helpers/time';
import {deployments, ethers, getNamedAccounts} from 'hardhat';
import {BigNumber} from 'ethers';
const {expectRevert} = require('@openzeppelin/test-helpers');

export default async function suite() {
  describe('Project milestone repayment', async () => {
    let approvalRequest: BigNumber;

    beforeEach(async function () {
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
          .connect(this.deployerSigner)
          .getAmountToBeRepaid(this.loanId)
      );
      await this.registryContract
        .connect(this.deployerSigner)
        .executePayment(this.loanId);
      const loanStatus = await this.registryContract.loanStatus(this.loanId);

      // Correct Status.
      expect(loanStatus.toString()).to.be.equal(LoanStatus.SETTLED);
    });

    it('should revert in case it does not have allowancee', async function () {
      // When && Then
      await expectRevert(
        this.registryContract
          .connect(this.deployerSigner)
          .executePayment(this.loanId),
        'transfer amount exceeds allowance'
      );
    });

    it('should revert when repaying a project loan out of time', async function () {
      // When
      const loanPayments = await this.registryContract.projectLoanPayments(
        this.loanId
      );

      // Move time to 1 month, so we can trigger the exception
      await increaseTime(this.deployerSigner.provider, 30 * 24 * 60 * 60); // One Month

      await this.lendingTokenContract
        .connect(this.deployerSigner)
        .approve(
          this.registryContract.address,
          await this.registryContract.getAmountToBeRepaid(this.loanId)
        );

      // Then
      await expectRevert(
        this.registryContract
          .connect(this.deployerSigner)
          .executePayment(this.loanId),
        'Only between awaiting for repayment timeframe'
      );
    });
  });
}
