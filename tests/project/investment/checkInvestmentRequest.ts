import BN from 'bn.js';
import {ProjectStatusTypes} from '../../helpers/ProjectEnums';
import {BASE_AMOUNT} from '../../helpers/constants';
import {ethers} from 'hardhat';
import {BigNumber} from 'ethers';
import chai, {expect} from 'chai';
import {solidity} from 'ethereum-waffle';
import {getTransactionTimestamp} from '../../helpers/time';
const {expectRevert} = require('@openzeppelin/test-helpers');

chai.use(solidity);

export default async function suite() {
  describe('Investment request', async () => {
    it('when trying to start lottery phase should revert', async function () {
      await expectRevert(
        this.governanceContract
          .connect(this.deployerSigner)
          .startLotteryPhase(this.projectId),
        'Only super delegator can call this function'
      );

      // When && Then
      await expectRevert(
        this.governanceContract
          .connect(this.superDelegatorSigner)
          .startLotteryPhase(this.projectId),
        'Interest must have been shown'
      );
    });

    it('when all details are stored correctly', async function () {
      const projectId = await this.projectManagerContract.totalProjects();
      const approvalRequest =
        await this.governanceContract.totalApprovalRequests();
      const initSeekerInvestmentTokenBalance =
        await this.investmentTokenContract.balanceOf(this.seeker);

      const initEscrowInvestmentTokenBalance =
        await this.investmentTokenContract.balanceOf(
          this.escrowContract.address
        );
      const initEscrowFundingNftBalance =
        await this.fundingNFTContract.balanceOf(
          this.escrowContract.address,
          projectId
        );

      const amountOfTokensToBePurchased = ethers.utils.parseEther('100000');
      const totalAmountRequested = ethers.utils.parseEther('10000');
      const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

      const requestInvestment = await this.investmentContract
        .connect(this.seekerSigner)
        .requestInvestment(
          this.investmentTokenContract.address,
          amountOfTokensToBePurchased,
          this.lendingTokenContract.address,
          totalAmountRequested,
          ipfsHash
        );

      const newSeekerInvestmentTokenBalance =
        await this.investmentTokenContract.balanceOf(this.seeker);
      const newEscrowInvestmentTokenBalance =
        await this.investmentTokenContract.balanceOf(
          this.escrowContract.address
        );
      const tokenId = BigNumber.from(
        new BN(0).ishln(128).or(new BN(projectId.toNumber())).toString()
      );
      const newEscrowFundingNftBalance =
        await this.fundingNFTContract.balanceOf(
          this.escrowContract.address,
          tokenId
        );

      const isPaused = await this.fundingNFTContract.transfersPaused(projectId);

      const projectStatus = await this.investmentContract.projectStatus(
        projectId
      );
      const investmentDetails = await this.investmentContract.investmentDetails(
        projectId
      );
      const investmentSeeker = await this.investmentContract.projectSeeker(
        projectId
      );
      const investmentTokensPerTicket =
        await this.investmentContract.investmentTokensPerTicket(projectId);
      const daoApprovalRequest = await this.governanceContract.approvalRequests(
        approvalRequest
      );
      const totalPartitions = totalAmountRequested.div(
        ethers.utils.parseEther(BASE_AMOUNT + '')
      );

      // Events
      expect(requestInvestment)
        .to.emit(this.investmentContract, 'ProjectRequested')
        .withArgs(projectId, this.seeker, totalAmountRequested);
      // Correct Details.
      expect(investmentDetails.investmentId.toString()).to.be.equal(
        projectId.toString()
      );
      expect(investmentDetails.investmentToken).to.be.equal(
        this.investmentTokenContract.address
      );
      expect(investmentDetails.investmentTokensAmount.toString()).to.be.equal(
        amountOfTokensToBePurchased
      );
      expect(investmentDetails.extraInfo).to.be.equal(ipfsHash);
      expect(
        investmentDetails.totalPartitionsToBePurchased.toString()
      ).to.be.equal(totalPartitions.toString());

      // Correct Status.
      expect(projectStatus.toString()).to.be.equal(
        ProjectStatusTypes.REQUESTED
      );
      // Correct Seeker.
      expect(investmentSeeker.toString()).to.be.equal(this.seeker);
      // Correct investmentTokensPerTicket.
      expect(investmentTokensPerTicket.toString()).to.be.equal(
        amountOfTokensToBePurchased.div(totalPartitions)
      );
      // Investment id is incremented correctly
      expect(await this.projectManagerContract.totalProjects()).to.be.equal(
        projectId.add(1)
      );

      // Correct Balances.
      expect(
        initSeekerInvestmentTokenBalance
          .sub(newSeekerInvestmentTokenBalance)
          .toString()
      ).to.be.equal(amountOfTokensToBePurchased.toString());
      expect(
        newEscrowInvestmentTokenBalance
          .sub(initEscrowInvestmentTokenBalance)
          .toString()
      ).to.be.equal(amountOfTokensToBePurchased.toString());
      expect(
        newEscrowFundingNftBalance.sub(initEscrowFundingNftBalance).toString()
      ).to.be.equal(totalPartitions.toString());

      // Correct Nft Behavior.
      expect(isPaused).to.be.equal(true);

      // Correct Dao Request.
      expect(daoApprovalRequest.projectId.toString()).to.be.equal(
        projectId.toString()
      );
      expect(daoApprovalRequest.approvalsProvided.toNumber()).equal(0);
      expect(daoApprovalRequest.isApproved).to.be.equal(false);
      expect(daoApprovalRequest.createdDate).to.be.equal(
        await getTransactionTimestamp(requestInvestment.hash)
      );
    });

    it('when the requested amount is not a multiple of the base amount', async function () {
      const amountOfTokensToBePurchased = ethers.utils.parseEther('100000');
      const totalAmountRequested = ethers.utils.parseEther('30001');
      const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

      await expectRevert(
        this.investmentContract
          .connect(this.seekerSigner)
          .requestInvestment(
            this.investmentTokenContract.address,
            amountOfTokensToBePurchased,
            this.lendingTokenContract.address,
            totalAmountRequested,
            ipfsHash
          ),
        'Token amount and price should result in integer amount of tickets'
      );
    });

    it('when the lending token does not exist', async function () {
      const amountOfTokensToBePurchased = ethers.utils.parseEther('100000');
      const totalAmountRequested = ethers.utils.parseEther('30001');
      const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

      await expectRevert(
        this.investmentContract
          .connect(this.seekerSigner)
          .requestInvestment(
            this.investmentTokenContract.address,
            amountOfTokensToBePurchased,
            this.investmentTokenContract.address,
            totalAmountRequested,
            ipfsHash
          ),
        'Lending token not supported'
      );
    });

    it('when the requested amount is not a multiple of the investment tokens amount', async function () {
      const amountOfTokensToBePurchased = ethers.utils.parseEther('100001');
      const totalAmountRequested = ethers.utils.parseEther('30000');
      const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

      await expectRevert(
        this.investmentContract
          .connect(this.seekerSigner)
          .requestInvestment(
            this.investmentTokenContract.address,
            amountOfTokensToBePurchased,
            this.lendingTokenContract.address,
            totalAmountRequested,
            ipfsHash
          ),
        'Token amount and price should result in integer amount of tickets'
      );
    });

    it('when investment request is rejected', async function () {
      const projectId = await this.projectManagerContract.totalProjects();

      await expect(
        this.investmentContract
          .connect(this.seekerSigner)
          .requestInvestment(
            this.investmentTokenContract.address,
            this.amountOfTokensToBePurchased,
            this.lendingTokenContract.address,
            this.totalAmountRequested,
            this.ipfsHash
          )
      )
        .to.emit(this.investmentContract, 'ProjectRequested')
        .withArgs(projectId, this.seeker, this.totalAmountRequested);

      await this.governanceContract
        .connect(this.superDelegatorSigner)
        .superVoteForRequest(this.approvalRequest.add(1), false);

      const projectStatus = (
        await this.investmentContract.getInvestmentMetadata(projectId)
      )[1];
      // Correct Status.
      expect(projectStatus.toString()).to.be.equal(ProjectStatusTypes.REJECTED);
    });
  });
}
