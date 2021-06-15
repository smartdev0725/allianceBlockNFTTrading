import BN from 'bn.js';
import { LoanType, LoanStatus } from '../../helpers/registryEnums';
import { BASE_AMOUNT } from '../../helpers/constants';
import { ethers } from 'hardhat';
import { BigNumber } from 'ethers';
import chai, { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
const { expectRevert } = require('@openzeppelin/test-helpers');

chai.use(solidity);

export default async function suite() {
  describe('Investment request', async () => {
    it('when all details are stored correctly', async function () {
      const loanId = await this.registryContract.totalLoans();
      const approvalRequest =
        await this.governanceContract.totalApprovalRequests();
      const initSeekerProjectTokenBalance =
        await this.projectTokenContract.balanceOf(this.seeker);

      const initEscrowProjectTokenBalance =
        await this.projectTokenContract.balanceOf(this.escrowContract.address);
      const initEscrowFundingNftBalance =
        await this.fundingNFTContract.balanceOf(
          this.escrowContract.address,
          loanId
        );

      const amountOfTokensToBePurchased = ethers.utils.parseEther('100000');
      const totalAmountRequested = ethers.utils.parseEther('30000');
      const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

      await expect(this.registryContract
        .connect(this.seekerSigner)
        .requestInvestment(
          this.projectTokenContract.address,
          amountOfTokensToBePurchased,
          totalAmountRequested,
          ipfsHash
        )).to.emit(this.registryContract, "InvestmentRequested").withArgs(loanId, this.seeker, totalAmountRequested);

      const newSeekerProjectTokenBalance =
        await this.projectTokenContract.balanceOf(this.seeker);
      const newEscrowProjectTokenBalance =
        await this.projectTokenContract.balanceOf(this.escrowContract.address);
      const tokenId = BigNumber.from(
        new BN(0)
          .ishln(128)
          .or(new BN(loanId.toNumber()))
          .toString()
      );
      const newEscrowFundingNftBalance =
        await this.fundingNFTContract.balanceOf(
          this.escrowContract.address,
          tokenId
        );

      const isPaused = await this.fundingNFTContract.transfersPaused(loanId);

      const loanStatus = await this.registryContract.loanStatus(loanId);
      const loanDetails = await this.registryContract.loanDetails(loanId);
      const loanSeeker = await this.registryContract.loanSeeker(loanId);
      const investmentTokensPerTicket = await this.registryContract.investmentTokensPerTicket(
        loanId
      );
      const daoApprovalRequest = await this.governanceContract.approvalRequests(
        approvalRequest
      );
      const totalPartitions = totalAmountRequested.div(ethers.utils.parseEther(BASE_AMOUNT + ''));

      // Correct Details.
      expect(loanDetails.loanType.toString()).to.be.equal(LoanType.INVESTMENT);
      expect(loanDetails.loanId.toString()).to.be.equal(loanId.toString());
      expect(loanDetails.collateralToken).to.be.equal(
        this.projectTokenContract.address
      );
      expect(loanDetails.collateralAmount.toString()).to.be.equal(
        amountOfTokensToBePurchased
      );
      expect(loanDetails.lendingAmount.toString()).to.be.equal(
        totalAmountRequested.toString()
      );
      expect(loanDetails.interestPercentage.toString()).to.be.equal('0');
      expect(loanDetails.totalInterest.toString()).to.be.equal('0');
      expect(loanDetails.extraInfo).to.be.equal(ipfsHash);
      expect(loanDetails.totalPartitions.toString()).to.be.equal(
        totalPartitions.toString()
      );
      // Correct Status.
      expect(loanStatus.toString()).to.be.equal(LoanStatus.REQUESTED);
      // Correct Seeker.
      expect(loanSeeker.toString()).to.be.equal(this.seeker);
      // Correct investmentTokensPerTicket.
      expect(investmentTokensPerTicket.toString()).to.be.equal(amountOfTokensToBePurchased.div(totalPartitions));
      // Loan id is incremented correctly
      expect(await this.registryContract.totalLoans()).to.be.equal(loanId.add(1));

      // Correct Balances.
      expect(
        initSeekerProjectTokenBalance.sub(newSeekerProjectTokenBalance).toString()
      ).to.be.equal(amountOfTokensToBePurchased.toString());
      expect(
        newEscrowProjectTokenBalance.sub(initEscrowProjectTokenBalance).toString()
      ).to.be.equal(amountOfTokensToBePurchased.toString());
      expect(
        newEscrowFundingNftBalance.sub(initEscrowFundingNftBalance).toString()
      ).to.be.equal(totalPartitions.toString());

      // Correct Nft Behavior.
      expect(isPaused).to.be.equal(true);

      // Correct Dao Request.
      expect(daoApprovalRequest.loanId.toString()).to.be.equal(
        loanId.toString()
      );
      expect(daoApprovalRequest.approvalsProvided.toNumber()).equal(0);
      expect(daoApprovalRequest.isApproved).to.be.equal(false);
    });

    it('when the requested amount is not a multiple of the base amount', async function () {
      const amountOfTokensToBePurchased = ethers.utils.parseEther('100000');
      const totalAmountRequested = ethers.utils.parseEther('30001');
      const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

      await expectRevert(this.registryContract
        .connect(this.seekerSigner)
        .requestInvestment(
          this.projectTokenContract.address,
          amountOfTokensToBePurchased,
          totalAmountRequested,
          ipfsHash
        ), "Token amount and price should result in integer amount of tickets");
    });

    it('when the requested amount is not a multiple of the investment tokens amount', async function () {
      const amountOfTokensToBePurchased = ethers.utils.parseEther('100001');
      const totalAmountRequested = ethers.utils.parseEther('30000');
      const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

      await expectRevert(this.registryContract
        .connect(this.seekerSigner)
        .requestInvestment(
          this.projectTokenContract.address,
          amountOfTokensToBePurchased,
          totalAmountRequested,
          ipfsHash
        ), "Token amount and price should result in integer amount of tickets");
    })
  });
}
