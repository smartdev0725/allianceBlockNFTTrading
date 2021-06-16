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
          this.projectTokenContract.address,
          amountOfTokensToBePurchased,
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
          this.projectTokenContract.address,
          amountOfTokensToBePurchased,
          totalAmountRequested,
          ipfsHash
        );

      await this.governanceContract.connect(this.superDelegatorSigner).superVoteForRequest(approvalRequest, true);

      // Then
      await expectRevert(
        this.governanceContract.connect(this.superDelegatorSigner).superVoteForRequest(approvalRequest, true),
        'Cannot approve again same investment'
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
          this.projectTokenContract.address,
          amountOfTokensToBePurchased,
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
}
