import {expect} from 'chai';
import {BASE_AMOUNT} from '../../helpers/constants';
import {increaseTime} from '../../helpers/time';
import {deployments, ethers, getNamedAccounts} from 'hardhat';
const {expectEvent} = require('@openzeppelin/test-helpers');
import {BigNumber} from 'ethers';

export default async function suite() {
  describe('Project token repayment', async () => {
    beforeEach(async function () {
      await this.registryContract
        .connect(this.lender1Signer)
        .fundLoan(this.loanId, this.bigPartition);
      await this.registryContract
        .connect(this.lender2Signer)
        .fundLoan(this.loanId, this.bigPartition);
    });

    it('when project tokens can not be claimed if no milestones are delivered yet', async function () {
      const convertibleAmountLender0 =
        await this.registryContract.getAvailableFundingNFTForConversion(
          this.loanId,
          this.lender1
        );
      const convertibleAmountLender1 =
        await this.registryContract.getAvailableFundingNFTForConversion(
          this.loanId,
          this.lender2
        );

      expect(convertibleAmountLender0.toNumber()).to.be.equal(0);
      expect(convertibleAmountLender1.toNumber()).to.be.equal(0);
    });

    it('when a percent of NFT can be converted after delivering the first milestone', async function () {
      this.approvalRequest =
        await this.governanceContract.totalApprovalRequests();
      await this.registryContract
        .connect(this.seekerSigner)
        .applyMilestone(this.loanId);
      await this.governanceContract
        .connect(this.superDelegatorSigner)
        .superVoteForRequest(this.approvalRequest, true);

      const convertibleAmountLender0 =
        await this.registryContract.getAvailableFundingNFTForConversion(
          this.loanId,
          this.lender1
        );
      const expectedAmount = this.bigPartition
        .mul(this.amountRequestedPerMilestone[0])
        .div(this.totalAmountRequested);

      expect(convertibleAmountLender0.toString()).to.be.equal(
        expectedAmount.toString()
      );

      const balanceLenderBefore = await this.projectTokenContract.balanceOf(
        this.lender1
      );
      const balanceEscrowBefore = await this.projectTokenContract.balanceOf(
        this.escrowContract.address
      );
      const balanceNFTLenderBefore =
        await this.registryContract.balanceOfAllFundingNFTGenerations(
          this.loanId,
          this.lender1
        );

      // Test getter first
      const getterProjectTokenAmount = await this.registryContract
        .connect(this.lender1Signer)
        .getAmountOfProjectTokensToReceive(
          this.loanId,
          convertibleAmountLender0
        );
      // Request to receive project tokens as repayment for all of the convertible NFT
      const tx1 = await this.registryContract
        .connect(this.lender1Signer)
        .receivePayment(this.loanId, convertibleAmountLender0, true);

      const balanceNFTLenderAfter =
        await this.registryContract.balanceOfAllFundingNFTGenerations(
          this.loanId,
          this.lender1
        );
      const balanceLenderAfter = await this.projectTokenContract.balanceOf(
        this.lender1
      );
      const balanceEscrowAfter = await this.projectTokenContract.balanceOf(
        this.escrowContract.address
      );
      const loanPayments = await this.registryContract.projectLoanPayments(
        this.loanId
      );
      const expectedAmountToReceive = convertibleAmountLender0.mul(
        ethers.utils.parseEther(BASE_AMOUNT + '')
      );
      const tokenPrice = await this.registryContract.getProjectTokenPrice(
        this.loanId
      );
      const discountedPrice = tokenPrice.sub(
        tokenPrice
          .mul(loanPayments.discountPerMillion)
          .div(BigNumber.from(1000000))
      );
      const expectedProjectTokenAmount =
        expectedAmountToReceive.div(discountedPrice);
      const remainingLendingAmountToPayBack = this.totalAmountRequested.sub(
        expectedAmountToReceive
      );
      const amountToBeRepaid = remainingLendingAmountToPayBack.add(
        remainingLendingAmountToPayBack
          .mul(this.interestPercentage)
          .div(BigNumber.from(100))
      );

      // Correct balances
      expect(getterProjectTokenAmount.toString()).to.be.equal(
        expectedProjectTokenAmount.toString()
      );
      expect(
        balanceNFTLenderBefore.sub(convertibleAmountLender0).toString()
      ).to.be.equal(balanceNFTLenderAfter.toString());
      expect(
        balanceLenderBefore.add(expectedProjectTokenAmount).toString()
      ).to.be.equal(balanceLenderAfter.toString());
      expect(
        balanceEscrowBefore.sub(expectedProjectTokenAmount).toString()
      ).to.be.equal(balanceEscrowAfter.toString());
      // TODO: check balances of token from generation 1

      // Correct partitions paid in project tokens tracked and updated amount to settle the loan
      expect(loanPayments.partitionsPaidInProjectTokens.toString()).to.be.equal(
        convertibleAmountLender0.toString()
      );
      const amountToBeRepaidLoanId =
        await this.registryContract.getAmountToBeRepaid(this.loanId);
      expect(amountToBeRepaidLoanId.toString()).to.be.equal(
        amountToBeRepaid.toString()
      );

      // Correct Event.
      expectEvent(tx1.receipt, 'PaymentReceived', {
        loanId: this.loanId,
        amountOfTokens: convertibleAmountLender0,
        generation: BigNumber.from(0),
        onProjectTokens: true,
        user: this.lender1,
      });
      expectEvent(tx1.receipt, 'ProjectTokenPaymentReceived', {
        loanId: this.loanId,
        user: this.lender1,
        amountOfProjectTokens: expectedProjectTokenAmount,
        discountedPrice,
      });
    });

    it('when more NFT can be converted after delivering the second milestone', async function () {
      const milestonesToDeliver = 2;
      for (let i = 0; i < milestonesToDeliver; i++) {
        this.approvalRequest =
          await this.governanceContract.totalApprovalRequests();
        await this.registryContract
          .connect(this.deployerSigner)
          .applyMilestone(this.loanId);
        await this.governanceContract
          .connect(this.superDelegatorSigner)
          .superVoteForRequest(this.approvalRequest, true);

        await increaseTime(
          this.deployerSigner.provider,
          +this.milestoneDurations[i]
        );
      }

      const convertibleAmountLender0 =
        await this.registryContract.getAvailableFundingNFTForConversion(
          this.loanId,
          this.lender1
        );
      const expectedAmount = this.bigPartition
        .mul(
          this.amountRequestedPerMilestone[0].add(
            this.amountRequestedPerMilestone[1]
          )
        )
        .div(this.totalAmountRequested);

      expect(convertibleAmountLender0.toNumber()).to.be.equal(
        expectedAmount.toNumber()
      );

      const balanceLenderBefore = await this.projectTokenContract.balanceOf(
        this.lender1
      );
      const balanceEscrowBefore = await this.projectTokenContract.balanceOf(
        this.escrowContract.address
      );
      const balanceNFTLenderBefore =
        await this.registryContract.balanceOfAllFundingNFTGenerations(
          this.loanId,
          this.lender1
        );

      // Test getter first
      const getterProjectTokenAmount = await this.registryContract
        .connect(this.lender1Signer)
        .getAmountOfProjectTokensToReceive(
          this.loanId,
          convertibleAmountLender0
        );
      // Request to receive project tokens as repayment
      const tx1 = await this.registryContract
        .connect(this.lender1Signer)
        .receivePayment(this.loanId, convertibleAmountLender0, true);

      const balanceNFTLenderAfter =
        await this.registryContract.balanceOfAllFundingNFTGenerations(
          this.loanId,
          this.lender1
        );
      const balanceLenderAfter = await this.projectTokenContract.balanceOf(
        this.lender1
      );
      const balanceEscrowAfter = await this.projectTokenContract.balanceOf(
        this.escrowContract.address
      );
      const loanPayments = await this.registryContract.projectLoanPayments(
        this.loanId
      );
      const expectedAmountToReceive = convertibleAmountLender0.mul(
        ethers.utils.parseEther(BASE_AMOUNT + '')
      );
      const tokenPrice = await this.registryContract.getProjectTokenPrice(
        this.loanId
      );
      const discountedPrice = tokenPrice.sub(
        tokenPrice
          .mul(loanPayments.discountPerMillion)
          .div(BigNumber.from(1000000))
      );
      const expectedProjectTokenAmount =
        expectedAmountToReceive.div(discountedPrice);
      const remainingLendingAmountToPayBack = this.totalAmountRequested.sub(
        expectedAmountToReceive
      );
      const amountToBeRepaid = remainingLendingAmountToPayBack.add(
        remainingLendingAmountToPayBack
          .mul(this.interestPercentage)
          .div(BigNumber.from(100))
      );

      // Correct balances
      expect(getterProjectTokenAmount.toString()).to.be.equal(
        expectedProjectTokenAmount.toString()
      );
      expect(
        balanceNFTLenderBefore.sub(convertibleAmountLender0).toString()
      ).to.be.equal(balanceNFTLenderAfter.toString());
      expect(
        balanceLenderBefore.add(expectedProjectTokenAmount).toString()
      ).to.be.equal(balanceLenderAfter.toString());
      expect(
        balanceEscrowBefore.sub(expectedProjectTokenAmount).toString()
      ).to.be.equal(balanceEscrowAfter.toString());
      // TODO: check balances of token from generation 1

      // Correct partitions paid in project tokens tracked and updated amount to settle the loan
      expect(loanPayments.partitionsPaidInProjectTokens.toString()).to.be.equal(
        convertibleAmountLender0.toString()
      );
      const amountToBeRepaidLoanId =
        await this.registryContract.getAmountToBeRepaid(this.loanId);
      expect(amountToBeRepaidLoanId.toString()).to.be.equal(
        amountToBeRepaid.toString()
      );

      // Correct Event.
      expectEvent(tx1.receipt, 'PaymentReceived', {
        loanId: this.loanId,
        amountOfTokens: convertibleAmountLender0,
        generation: BigNumber.from(0),
        onProjectTokens: true,
        user: this.lender1,
      });
      expectEvent(tx1.receipt, 'ProjectTokenPaymentReceived', {
        loanId: this.loanId,
        user: this.lender1,
        amountOfProjectTokens: expectedProjectTokenAmount,
        discountedPrice,
      });
    });

    it('when all NFT can be converted after delivering the third milestone', async function () {
      const milestonesToDeliver = 3;
      for (let i = 0; i < milestonesToDeliver; i++) {
        this.approvalRequest =
          await this.governanceContract.totalApprovalRequests();
        await this.registryContract
          .connect(this.deployerSigner)
          .applyMilestone(this.loanId);
        await this.governanceContract
          .connect(this.delegator1Signer)
          .voteForRequest(this.approvalRequest, true);
        await this.governanceContract
          .connect(this.delegator2Signer)
          .voteForRequest(this.approvalRequest, true);

        await increaseTime(
          this.deployerSigner.provider,
          +this.milestoneDurations[i]
        );
      }

      const convertibleAmountLender0 =
        await this.registryContract.getAvailableFundingNFTForConversion(
          this.loanId,
          this.lender1
        );
      const expectedAmount = this.bigPartition;

      expect(convertibleAmountLender0.toString()).to.be.equal(
        expectedAmount.toString()
      );
    });
  });
}
