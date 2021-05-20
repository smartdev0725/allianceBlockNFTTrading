import chai, {expect} from 'chai';
import {ONE_DAY, BASE_AMOUNT} from '../../helpers/constants';
import {deployments, ethers, getNamedAccounts} from 'hardhat';
import {BigNumber} from 'ethers';
import {solidity} from "ethereum-waffle";

chai.use(solidity);

export default async function suite() {
  describe('Check project investment', async () => {
    let loanId: BigNumber;
    let approvalRequest: BigNumber;
    let bigPartition: BigNumber;
    let totalPartitions: BigNumber;
    let totalAmountRequested: BigNumber;
    const totalMilestones = BigNumber.from(1); // Only 1 milestone for investments
    const interestPercentage = BigNumber.from(20);
    const amountRequestedPerMilestone = new Array<BigNumber>(totalMilestones);
    const milestoneDurations = new Array<BigNumber>(totalMilestones);

    beforeEach(async function () {
      loanId = await this.registryContract.totalLoans();
      approvalRequest = await this.governanceContract.totalApprovalRequests();

      const amountCollateralized = ethers.utils.parseEther('100000');
      const projectTokenPrice = BigNumber.from(1);
      const discountPerMillion = BigNumber.from(0); // There is no discount for investment types
      const paymentTimeInterval = BigNumber.from(20 * ONE_DAY);
      const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

      // The milestone duration should be 0 for investment type since there are really no milestones to deliver
      milestoneDurations[0] = BigNumber.from(0);
      amountRequestedPerMilestone[0] = ethers.utils.parseEther('10000');

      await this.registryContract
        .connect(this.seekerSigner)
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

      totalAmountRequested =
        amountRequestedPerMilestone[0].mul(totalMilestones);
      totalPartitions = totalAmountRequested.div(
        ethers.utils.parseEther(BASE_AMOUNT + '')
      );
      bigPartition = totalPartitions.div(BigNumber.from(2));

      await this.governanceContract
        .connect(this.superDelegatorSigner)
        .superVoteForRequest(approvalRequest, true);

      await this.registryContract
        .connect(this.lender1Signer)
        .fundLoan(loanId, bigPartition);
      await this.registryContract
        .connect(this.lender2Signer)
        .fundLoan(loanId, bigPartition);
    });

    it('when the first milestone is already approved after funding', async function () {
      const loanPayments = await this.registryContract.projectLoanPayments(
        loanId
      );

      expect(loanPayments.milestonesDelivered.toNumber()).to.be.equal(1);
    });

    it('when all NFT can be converted after funding', async function () {
      const convertibleAmountLender0 =
        await this.registryContract.getAvailableFundingNFTForConversion(
          loanId,
          this.lender1
        );

      expect(convertibleAmountLender0.toNumber()).to.be.equal(
        bigPartition.toNumber()
      );

      const balanceLenderBefore = await this.projectTokenContract.balanceOf(
        this.lender1
      );
      const balanceEscrowBefore = await this.projectTokenContract.balanceOf(
        this.escrowContract.address
      );
      const balanceNFTLenderBefore =
        await this.registryContract.balanceOfAllFundingNFTGenerations(
          loanId,
          this.lender1
        );

      // Test getter first
      const getterProjectTokenAmount = await this.registryContract
        .connect(this.lender1Signer)
        .getAmountOfProjectTokensToReceive(loanId, convertibleAmountLender0);

      // Request to receive project tokens as repayment for all of the convertible NFT
      await expect(
        this.registryContract
          .connect(this.lender1Signer)
          .receivePayment(loanId, convertibleAmountLender0, true)
      )
        .to.emit(this.registryContract, 'PaymentReceived')
        .withArgs(loanId.toString(), convertibleAmountLender0.toString(), '0', true, this.lender1);

      const balanceNFTLenderAfter =
        await this.registryContract.balanceOfAllFundingNFTGenerations(
          loanId,
          this.lender1
        );
      const balanceLenderAfter = await this.projectTokenContract.balanceOf(
        this.lender1
      );
      const balanceEscrowAfter = await this.projectTokenContract.balanceOf(
        this.escrowContract.address
      );
      const loanPayments = await this.registryContract.projectLoanPayments(
        loanId
      );
      const expectedAmountToReceive = convertibleAmountLender0.mul(
        ethers.utils.parseEther(BASE_AMOUNT + '')
      );
      const tokenPrice = await this.registryContract.getProjectTokenPrice(
        loanId
      );
      const discountedPrice = tokenPrice.sub(
        tokenPrice
          .mul(loanPayments.discountPerMillion)
          .div(BigNumber.from(1000000))
      );
      const expectedProjectTokenAmount =
        expectedAmountToReceive.div(discountedPrice);
      const remainingLendingAmountToPayBack = totalAmountRequested.sub(
        expectedAmountToReceive
      );
      const amountToBeRepaid = remainingLendingAmountToPayBack.add(
        remainingLendingAmountToPayBack
          .mul(interestPercentage)
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
        await this.registryContract.getAmountToBeRepaid(loanId);
      expect(amountToBeRepaidLoanId.toString()).to.be.equal(
        amountToBeRepaid.toString()
      );

    });
  });
}
