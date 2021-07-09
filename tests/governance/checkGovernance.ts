import {ethers} from 'hardhat';
const {expectRevert} = require('@openzeppelin/test-helpers');
import {expect} from 'chai';

export default async function suite() {
  describe('Governance supervote', async () => {
    it('When execute supervote with another user should revert', async function () {
      // Given
      const approvalRequest = await this.governanceContract.totalApprovalRequests();
      const amountOfTokensToBePurchased = ethers.utils.parseEther('1000');
      const totalAmountRequested = ethers.utils.parseEther('200');
      const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

      // When
      await this.registryContract
        .connect(this.seekerSigner)
        .requestInvestment(
          this.investmentTokenContract.address,
          amountOfTokensToBePurchased,
          this.lendingTokenContract.address,
          totalAmountRequested,
          ipfsHash
        );

      // Then
      await expectRevert(
        this.governanceContract.connect(this.delegator1Signer).superVoteForRequest(approvalRequest, true),
        'Only super delegator can call this function'
      );
    });

    it('When execute supervote a couple of times should revert', async function () {
      // Given
      const approvalRequest = await this.governanceContract.totalApprovalRequests();
      const amountOfTokensToBePurchased = ethers.utils.parseEther('1000');
      const totalAmountRequested = ethers.utils.parseEther('200');
      const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

      // When
      await this.registryContract
        .connect(this.seekerSigner)
        .requestInvestment(
          this.investmentTokenContract.address,
          amountOfTokensToBePurchased,
          this.lendingTokenContract.address,
          totalAmountRequested,
          ipfsHash
        );

      await this.governanceContract.connect(this.superDelegatorSigner).superVoteForRequest(approvalRequest, true);

      // Then
      await expectRevert(
        this.governanceContract.connect(this.superDelegatorSigner).superVoteForRequest(approvalRequest, true),
        'Cannot process again same investment'
      );
    });

    it('When execute supervote a couple of times for false should revert', async function () {
      // Given
      const approvalRequest = await this.governanceContract.totalApprovalRequests();
      const amountOfTokensToBePurchased = ethers.utils.parseEther('1000');
      const totalAmountRequested = ethers.utils.parseEther('200');
      const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

      // When
      await this.registryContract
        .connect(this.seekerSigner)
        .requestInvestment(
          this.investmentTokenContract.address,
          amountOfTokensToBePurchased,
          this.lendingTokenContract.address,
          totalAmountRequested,
          ipfsHash
        );

      await this.governanceContract.connect(this.superDelegatorSigner).superVoteForRequest(approvalRequest, false);

      // Then
      await expectRevert(
        this.governanceContract.connect(this.superDelegatorSigner).superVoteForRequest(approvalRequest, false),
        'Cannot process again same investment'
      );
    });

    it('When execute supervote should emit an event', async function () {
      // Given
      const approvalRequest = await this.governanceContract.totalApprovalRequests();
      const amountOfTokensToBePurchased = ethers.utils.parseEther('1000');
      const totalAmountRequested = ethers.utils.parseEther('200');
      const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';
      const investmentId = await this.registryContract.totalInvestments();

      // When
      await this.registryContract
        .connect(this.seekerSigner)
        .requestInvestment(
          this.investmentTokenContract.address,
          amountOfTokensToBePurchased,
          this.lendingTokenContract.address,
          totalAmountRequested,
          ipfsHash
        );

      // Then
      await expect(
        this.governanceContract.connect(this.superDelegatorSigner).superVoteForRequest(approvalRequest, true)
      ).to.emit(this.governanceContract, 'VotedForRequest').withArgs(investmentId, approvalRequest, true, this.superDelegator);
    });

  });

  describe('Governance initialization', async () => {
    it('When initialize again should revert', async function () {
      const registryAddress = "0x664f6b4987d9db811867f431911124109ed5a475";

      await expectRevert(
        this.governanceContract.setRegistry(registryAddress),
        'Cannot initialize second time'
      );
    });

    it('When initialize with zero address should revert', async function () {
      await expectRevert(
        this.governanceContract.setRegistry( ethers.constants.AddressZero),
        'Cannot initialize with 0 addresses'
      );
    });

  });

  describe('Governance update', async () => {
    it('When update superdelegator with another user should revert', async function () {
      const otherAddress = "0x664f6b4987d9db811867f431911124109ed5a475";

      await expectRevert(
        this.governanceContract.connect(this.seekerSigner).updateSuperDelegator(otherAddress),
        'caller is not the owner'
      );
    });

    it('When update superdelegator with zero address should revert', async function () {
      await expectRevert(
        this.governanceContract.connect(this.deployerSigner).updateSuperDelegator( ethers.constants.AddressZero),
        'Cannot initialize with 0 addresses'
      );
    });

    it('When update superdelegator should be success', async function () {
      // Given and When
      this.governanceContract.connect(this.deployerSigner).updateSuperDelegator(this.seeker);

      // Then
      const superDelegator = await this.governanceContract.superDelegator();
      expect(superDelegator).to.be.equal(this.seeker);

    });

    it('When requestApproval not from registry should revert', async function () {
      await expectRevert(
        this.governanceContract.requestApproval(1),
        'Only Registry contract'
      );
    });

  });
}
