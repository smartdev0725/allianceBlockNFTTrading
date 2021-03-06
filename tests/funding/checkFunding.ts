import {expect} from 'chai';
import {ethers} from 'hardhat';
const {expectRevert} = require('@openzeppelin/test-helpers');

export default async function suite() {
  describe('Succeeds', async () => {
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
        expect(MINTER_ROLE).to.equal(
          ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE'])
        );
        expect(PAUSER_ROLE).to.equal(
          ethers.utils.solidityKeccak256(['string'], ['PAUSER_ROLE'])
        );
      });

      it('should get correct role status', async function () {
        // Given
        const isMinter = await this.fundingNFTContract.hasRole(
          ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE']),
          this.investmentContract.address
        );

        const isPauser = await this.fundingNFTContract.hasRole(
          ethers.utils.solidityKeccak256(['string'], ['PAUSER_ROLE']),
          this.investmentContract.address
        );

        // When and Then
        expect(isMinter).to.be.equal(true);
        expect(isPauser).to.be.equal(true);
      });

      it('should get correct role status for other address', async function () {
        // Given
        const isMinter = await this.fundingNFTContract.hasRole(
          ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE']),
          this.lender1
        );

        const isPauser = await this.fundingNFTContract.hasRole(
          ethers.utils.solidityKeccak256(['string'], ['PAUSER_ROLE']),
          this.lender1
        );

        // When and Then
        expect(isMinter).to.be.equal(false);
        expect(isPauser).to.be.equal(false);
      });

      it('should get correct interface support', async function () {
        // Given
        const supportERC1155 = await this.fundingNFTContract.supportsInterface(
          '0xd9b67a26'
        );
        const supportMetadata = await this.fundingNFTContract.supportsInterface(
          '0x0e89341c'
        );

        // When and Then
        expect(supportERC1155).to.be.equal(true);
        expect(supportMetadata).to.be.equal(true);
      });
    });

    describe('Basic Minting', () => {
      it('only minter role should be able to mint a new NFT', async function () {
        await expectRevert(
          this.fundingNFTContract
            .connect(this.lender1Signer)
            .mintGen0(this.lender1, 10, 1),
          'Must have minter role to mint'
        );
      });

      it('should get correct balance for lender1', async function () {
        await this.fundingNFTContract
          .connect(this.seekerSigner)
          .mintGen0(this.lender1, 10, 1);
        const balance = await this.fundingNFTContract.balanceOf(
          this.lender1,
          1
        );
        expect(balance.toString()).to.be.equal('10');
      });

      it('only admin should grant role to new account', async function () {
        await expectRevert(
          this.fundingNFTContract
            .connect(this.lender1Signer)
            .grantRole(
              ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE']),
              this.lender1
            ),
          'AccessControl: sender must be an admin to grant'
        );
      });

      it('new minter should be able to mint a new NFT', async function () {
        await this.fundingNFTContract
          .connect(this.deployerSigner)
          .grantRole(
            ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE']),
            this.lender1
          );
        await this.fundingNFTContract
          .connect(this.lender1Signer)
          .mintGen0(this.staker1, 20, 1);
        const balance = await this.fundingNFTContract.balanceOf(
          this.staker1,
          1
        );
        expect(balance.toString()).to.be.equal('20');
      });

      it('should be able to query balances in batch', async function () {
        await this.fundingNFTContract
          .connect(this.seekerSigner)
          .mintGen0(this.lender1, 10, 1);
        await this.fundingNFTContract
          .connect(this.seekerSigner)
          .mintGen0(this.lender2, 20, 1);

        const balances = await this.fundingNFTContract.balanceOfBatch(
          [this.lender1, this.lender2],
          [1, 1]
        );

        expect(balances[0].toString()).to.be.equal('10');
        expect(balances[1].toString()).to.be.equal('20');
      });
    });

    describe('Generation Minting', () => {
      it('only minter role should be able to mint a new NFT', async function () {
        await expectRevert(
          this.fundingNFTContract
            .connect(this.lender1Signer)
            .mintOfGen(this.lender1, 10, 1, 1),
          'Must have minter role to mint'
        );
      });

      it('should get correct balance and generation for lender1', async function () {
        await this.fundingNFTContract
          .connect(this.seekerSigner)
          .mintOfGen(this.lender1, 10, 0, 1); //(to, amount, gen, investId)
        const balance = await this.fundingNFTContract.balanceOf(
          this.lender1,
          1// this should be the proper shifted NFT ID resulting of (gen|id)
        );
        expect(balance.toString()).to.be.equal('10');
      });

      it('new minter should be able to mint a new NFT', async function () {
        await this.fundingNFTContract
          .connect(this.deployerSigner)
          .grantRole(
            ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE']),
            this.lender1
          );
        await this.fundingNFTContract
          .connect(this.lender1Signer)
          .mintOfGen(this.staker1, 20, 0, 1);
        const balance = await this.fundingNFTContract.balanceOf(
          this.staker1,
          1 // this should be the proper shifted NFT ID resulting of (gen|id)
        );
        expect(balance.toString()).to.be.equal('20');
      });

      it('should be able to accumulate multiple mints', async function () {
        await this.fundingNFTContract
          .connect(this.seekerSigner)
          .mintGen0(this.lender1, 10, 1);
        await this.fundingNFTContract
          .connect(this.seekerSigner)
          .mintOfGen(this.lender1, 20, 0, 1);

        const balance = await this.fundingNFTContract.balanceOf(
          this.lender1,
          1 // this should be the proper shifted NFT ID resulting of (gen|id)
        );

        expect(balance.toString()).to.be.equal('30');
      });
    });

    describe('Investment Id and Generation', () => {
      it('only minter role should be able to mint gen0', async function () {
        const tx = await this.fundingNFTContract
          .connect(this.seekerSigner)
          .mintGen0(this.lender1, 10, 1);

        // Correct Event.
        await expect(tx)
          .to.emit(this.fundingNFTContract, 'TransferSingle')
          .withArgs(
            this.seeker,
            ethers.constants.AddressZero,
            this.lender1,
            1,
            10
          );
      });

      it('should be able to increase investment generation', async function () {
        await this.fundingNFTContract
          .connect(this.seekerSigner)
          .mintGen0(this.lender1, 15, 3);
        const tx = await this.fundingNFTContract
          .connect(this.seekerSigner)
          .increaseGeneration(3, this.lender1, 10);

        // Correct Event. Generation increased
        await expect(tx)
          .to.emit(this.fundingNFTContract, 'GenerationIncreased')
          .withArgs('3', this.lender1, '1');
      });

      it('should be able to increase multiple investment generations', async function () {
        await this.fundingNFTContract
          .connect(this.seekerSigner)
          .mintGen0(this.lender1, 15, 3);
        const tx = await this.fundingNFTContract
          .connect(this.seekerSigner)
          .increaseGenerations(3, this.lender1, 10, 1); // (id,user,amount,gensToAdd)

        // Correct Event. Generation increased
        await expect(tx)
          .to.emit(this.fundingNFTContract, 'GenerationIncreased')
          .withArgs('3', this.lender1, '1');
      });

      it('should not be able to decrease Gen0', async function () {
        await this.fundingNFTContract
          .connect(this.seekerSigner)
          .mintOfGen(this.lender1, 20, 0, 1);

        await expectRevert(this.fundingNFTContract
          .connect(this.seekerSigner)
          .decreaseGenerations( // (id,user,amount,gensToDec)
            1, // this should be the proper shifted NFT ID resulting of (gen|id)
            this.lender1,
            10,
            1
          ),
          'Invalid token ID'
        )
      });
    });

    describe('Token Pausing', function () {
      it('only pauser role should be able to pause token transfers', async function () {
        await expectRevert(
          this.fundingNFTContract
            .connect(this.lender1Signer)
            .pauseTokenTransfer(3),
          'Must have pauser role'
        );
      });

      it('should revert when transfering a paused token', async function () {
        await this.fundingNFTContract
          .connect(this.seekerSigner)
          .mintGen0(this.lender1, 15, 3);
        await this.fundingNFTContract
          .connect(this.staker1Signer)
          .pauseTokenTransfer(3);

        await expectRevert(
          this.fundingNFTContract
            .connect(this.lender1Signer)
            .safeTransferFrom(this.lender1, this.lender2, 3, 10, '0x'),
          'Transfers paused'
        );
      });

      it('should revert when increasing token generation of paused token', async function () {
        await this.fundingNFTContract
          .connect(this.seekerSigner)
          .mintGen0(this.lender1, 15, 3);
        await this.fundingNFTContract
          .connect(this.staker1Signer)
          .pauseTokenTransfer(3);

        await expectRevert(
          this.fundingNFTContract
            .connect(this.seekerSigner)
            .increaseGeneration(3, this.lender1, 10),
          'Transfers paused'
        );
      });

      it('should revert when user tries to burn a paused token', async function () {
        await this.fundingNFTContract
          .connect(this.seekerSigner)
          .mintGen0(this.lender1, 15, 3);
        await this.fundingNFTContract
          .connect(this.staker1Signer)
          .pauseTokenTransfer(3);

        await expectRevert(
          this.fundingNFTContract
            .connect(this.seekerSigner)
            .burn(this.lender1, 3, 10),
          'Transfers paused'
        );
      });
    });
  });
}
