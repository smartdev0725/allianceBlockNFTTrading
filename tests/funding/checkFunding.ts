import {expect} from 'chai';
import {ethers} from 'hardhat';
const {expectRevert} = require('@openzeppelin/test-helpers');

export default async function suite() {
  describe.only('Succeeds', async () => {

    describe('Initial values', () => {
      it('should get correct contract uri', async function () {
        // Given
        const contractURI = await this.fundingNFTContract.contractURI();
        // When and Then
        expect(contractURI).to.equal('https://allianceblock.io/');
      });

      it('should get correct role keys', async function () {
        // Given
        const MINTER_ROLE = await this.fundingNFTContract.MINTER_ROLE();
        const PAUSER_ROLE = await this.fundingNFTContract.PAUSER_ROLE();

        // When and Then
        expect(MINTER_ROLE).to.equal(ethers.utils.solidityKeccak256(["string",], ["MINTER_ROLE"]));
        expect(PAUSER_ROLE).to.equal(ethers.utils.solidityKeccak256(["string",], ["PAUSER_ROLE"]));

      });

      it('should get correct role status', async function () {
        // Given
        const isMinter = await this.fundingNFTContract.hasRole(
          ethers.utils.solidityKeccak256(["string",], ["MINTER_ROLE"]),
          this.registryContract.address
        );

        const isPauser = await this.fundingNFTContract.hasRole(
          ethers.utils.solidityKeccak256(["string",], ["PAUSER_ROLE"]),
          this.registryContract.address
        );

        // When and Then
        expect(isMinter).to.be.equal(true);
        expect(isPauser).to.be.equal(true);
      });

      it('should get correct role status for other address', async function () {
        // Given
        const isMinter = await this.fundingNFTContract.hasRole(
          ethers.utils.solidityKeccak256(["string",], ["MINTER_ROLE"]),
          this.lender1
        );

        const isPauser = await this.fundingNFTContract.hasRole(
          ethers.utils.solidityKeccak256(["string",], ["PAUSER_ROLE"]),
          this.lender1
        );

        // When and Then
        expect(isMinter).to.be.equal(false);
        expect(isPauser).to.be.equal(false);
      });

      it('should get correct interface support', async function () {
        // Given
        const supportERC1155 = await this.fundingNFTContract.supportsInterface('0xd9b67a26');
        const supportMetadata = await this.fundingNFTContract.supportsInterface('0x0e89341c');

        // When and Then
        expect(supportERC1155).to.be.equal(true);
        expect(supportMetadata).to.be.equal(true);
      });
    });

    describe('Basic Minting', () => {
      it('only minter role should be able to mint a new NFT', async function () {
        await expectRevert(
          this.fundingNFTContract.connect(this.lender1Signer).mintGen0(this.lender1, 10, 1),
          'Must have minter role to mint'
        );
      });

      it('should get correct balance for lender1', async function () {
        await this.fundingNFTContract.connect(this.seekerSigner).mintGen0(this.lender1, 10, 1);
        const balance = await this.fundingNFTContract.balanceOf(this.lender1, 1);
        expect(balance.toString()).to.be.equal('10');
      });

      it('only admin should grant role to new account', async function () {
        await expectRevert(
          this.fundingNFTContract.connect(this.lender1Signer).grantRole(ethers.utils.solidityKeccak256(["string",], ["MINTER_ROLE"]), this.lender1),
          'AccessControl: sender must be an admin to grant'
        );
      });

      it('new minter should be able to mint a new NFT', async function () {
        await this.fundingNFTContract.connect(this.deployerSigner).grantRole(
          ethers.utils.solidityKeccak256(["string",], ["MINTER_ROLE"]),
          this.lender1,
        );
        await this.fundingNFTContract.connect(this.lender1Signer).mintGen0(this.staker1, 20, 1);
        const balance = await this.fundingNFTContract.balanceOf(this.staker1, 1);
        expect(balance.toString()).to.be.equal('20');
      });

      it('should be able to query balances in batch', async function () {
        await this.fundingNFTContract.connect(this.seekerSigner).mintGen0(this.lender1, 10, 1);
        await this.fundingNFTContract.connect(this.seekerSigner).mintGen0(this.lender2, 20, 1);

        const balances = await this.fundingNFTContract.balanceOfBatch([this.lender1, this.lender2], [1, 1]);

        expect(balances[0].toString()).to.be.equal('10');
        expect(balances[1].toString()).to.be.equal('20');
      });
    });

    describe('Loan Id and Generation',  () => {
      it('only minter role should be able to mint gen0', async function () {
        const tx = await this.fundingNFTContract.connect(this.seekerSigner).mintGen0(this.lender1, 10, 1);

        // Correct Event.
        await expect(tx)
          .to.emit(this.fundingNFTContract, 'TransferSingle')
          .withArgs(this.seeker, ethers.constants.AddressZero, this.lender1, 1, 10);

      });

      //
      // it('should be able to increase loan generation', async function () {
      //   const tx = await this.fundingNFTContract.connect(this.seekerSigner).increaseGeneration(3, this.lender1, 10);
      //
      //   // Correct Event. Tokens burned
      //   await expect(tx)
      //     .to.emit(this.fundingNFTContract, 'TransferSingle')
      //     .withArgs(this.seeker, this.seeker, ethers.constants.AddressZero, 3, 10);
      //
      //   // Correct Event. New Gen Tokens minted
      //   await expect(tx)
      //     .to.emit(this.fundingNFTContract, 'TransferSingle')
      //     .withArgs(this.seeker, ethers.constants.AddressZero, this.seeker, 3, 10);
      //
      //   // const newTokenId = String(tx.logs[1].args.id);
      //   // const {generation, loanId} = await fundingNFT.formatTokenId(newTokenId);
      //   //
      //   // assert.equal(generation, 1);
      //   // assert.equal(loanId, 3);
      //
      // });
      //
      // it('should get correct balance for alice', async function () {
      //   const balanceGen0 = await fundingNFT.balanceOf(alice, 3);
      //
      //   const tokenId = await fundingNFT.getTokenId(1, 3);
      //   const balanceGen1 = await fundingNFT.balanceOf(alice, tokenId);
      //
      //   assert.equal(balanceGen0, 0);
      //   assert.equal(balanceGen1, 10);
      // });
    });
  });
}
