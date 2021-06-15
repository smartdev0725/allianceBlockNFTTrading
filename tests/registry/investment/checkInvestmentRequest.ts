import BN from 'bn.js';
import { LoanStatus} from '../../helpers/registryEnums';
import {BASE_AMOUNT} from '../../helpers/constants';
import {ethers} from 'hardhat';
import {BigNumber} from 'ethers';
import chai, {expect} from 'chai';
import {solidity} from 'ethereum-waffle';
const {expectRevert} = require('@openzeppelin/test-helpers');

chai.use(solidity);

export default async function suite() {
  describe('Investment request', async () => {
    it('when all details are stored correctly', async function () {
      const investmentId = await this.registryContract.totalInvestments();
      const approvalRequest =
        await this.governanceContract.totalApprovalRequests();
      const initSeekerProjectTokenBalance =
        await this.projectTokenContract.balanceOf(this.seeker);

      const initEscrowProjectTokenBalance =
        await this.projectTokenContract.balanceOf(this.escrowContract.address);
      const initEscrowFundingNftBalance =
        await this.fundingNFTContract.balanceOf(
          this.escrowContract.address,
          investmentId
        );

      const amountOfTokensToBePurchased = ethers.utils.parseEther('100000');
      const totalAmountRequested = ethers.utils.parseEther('30000');
      const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

      await expect(
        this.registryContract
          .connect(this.seekerSigner)
          .requestInvestment(
            this.projectTokenContract.address,
            amountOfTokensToBePurchased,
            totalAmountRequested,
            ipfsHash
          )
      )
        .to.emit(this.registryContract, 'InvestmentRequested')
        .withArgs(investmentId, this.seeker, totalAmountRequested);

      const newSeekerProjectTokenBalance =
        await this.projectTokenContract.balanceOf(this.seeker);
      const newEscrowProjectTokenBalance =
        await this.projectTokenContract.balanceOf(this.escrowContract.address);
      const tokenId = BigNumber.from(
        new BN(0).ishln(128).or(new BN(investmentId.toNumber())).toString()
      );
      const newEscrowFundingNftBalance =
        await this.fundingNFTContract.balanceOf(
          this.escrowContract.address,
          tokenId
        );

      const isPaused = await this.fundingNFTContract.transfersPaused(investmentId);

      const investmentStatus = await this.registryContract.investmentStatus(investmentId);
      const investmentDetails = await this.registryContract.investmentDetails(investmentId);
      const investmentSeeker = await this.registryContract.investmentSeeker(investmentId);
      const investmentTokensPerTicket =
        await this.registryContract.investmentTokensPerTicket(investmentId);
      const daoApprovalRequest = await this.governanceContract.approvalRequests(
        approvalRequest
      );
      const totalPartitions = totalAmountRequested.div(
        ethers.utils.parseEther(BASE_AMOUNT + '')
      );

      // Correct Details.
      expect(investmentDetails.investmentId.toString()).to.be.equal(investmentId.toString());
      expect(investmentDetails.projectToken).to.be.equal(
        this.projectTokenContract.address
      );
      expect(investmentDetails.projectTokensAmount.toString()).to.be.equal(
        amountOfTokensToBePurchased
      );
      expect(investmentDetails.extraInfo).to.be.equal(ipfsHash);
      expect(investmentDetails.totalPartitionsToBePurchased.toString()).to.be.equal(
        totalPartitions.toString()
      );
      // Correct Status.
      expect(investmentStatus.toString()).to.be.equal(LoanStatus.REQUESTED);
      // Correct Seeker.
      expect(investmentSeeker.toString()).to.be.equal(this.seeker);
      // Correct investmentTokensPerTicket.
      expect(investmentTokensPerTicket.toString()).to.be.equal(
        amountOfTokensToBePurchased.div(totalPartitions)
      );
      // Investment id is incremented correctly
      expect(await this.registryContract.totalInvestments()).to.be.equal(
        investmentId.add(1)
      );

      // Correct Balances.
      expect(
        initSeekerProjectTokenBalance
          .sub(newSeekerProjectTokenBalance)
          .toString()
      ).to.be.equal(amountOfTokensToBePurchased.toString());
      expect(
        newEscrowProjectTokenBalance
          .sub(initEscrowProjectTokenBalance)
          .toString()
      ).to.be.equal(amountOfTokensToBePurchased.toString());
      expect(
        newEscrowFundingNftBalance.sub(initEscrowFundingNftBalance).toString()
      ).to.be.equal(totalPartitions.toString());

      // Correct Nft Behavior.
      expect(isPaused).to.be.equal(true);

      // Correct Dao Request.
      expect(daoApprovalRequest.investmentId.toString()).to.be.equal(
        investmentId.toString()
      );
      expect(daoApprovalRequest.approvalsProvided.toNumber()).equal(0);
      expect(daoApprovalRequest.isApproved).to.be.equal(false);
    });

    it('when the requested amount is not a multiple of the base amount', async function () {
      const amountOfTokensToBePurchased = ethers.utils.parseEther('100000');
      const totalAmountRequested = ethers.utils.parseEther('30001');
      const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

      await expectRevert(
        this.registryContract
          .connect(this.seekerSigner)
          .requestInvestment(
            this.projectTokenContract.address,
            amountOfTokensToBePurchased,
            totalAmountRequested,
            ipfsHash
          ),
        'Token amount and price should result in integer amount of tickets'
      );
    });

    it('when the requested amount is not a multiple of the investment tokens amount', async function () {
      const amountOfTokensToBePurchased = ethers.utils.parseEther('100001');
      const totalAmountRequested = ethers.utils.parseEther('30000');
      const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

      await expectRevert(
        this.registryContract
          .connect(this.seekerSigner)
          .requestInvestment(
            this.projectTokenContract.address,
            amountOfTokensToBePurchased,
            totalAmountRequested,
            ipfsHash
          ),
        'Token amount and price should result in integer amount of tickets'
      );
    });
  });
}
