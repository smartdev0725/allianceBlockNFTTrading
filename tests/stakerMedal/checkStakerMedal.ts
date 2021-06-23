import {expect} from 'chai';
import {ethers} from 'hardhat';
const {expectRevert} = require('@openzeppelin/test-helpers');

export default async function suite() {
  describe('Succeeds', async () => {
    describe('Initial values', () => {
      it('should get correct role keys', async function () {
        // Given
        const MINTER_ROLE = await this.stakerMedalNFTContract.MINTER_ROLE();

        // When and Then
        expect(MINTER_ROLE).to.equal(
          ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE'])
        );
      });

      it('should get correct role status', async function () {
        // Given
        const isMinter = await this.stakerMedalNFTContract.hasRole(
          ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE']),
          this.stakingContract.address
        );

        // When and Then
        expect(isMinter).to.be.equal(true);
      });

      it('should get correct role status for other address', async function () {
        // Given
        const isMinter = await this.stakerMedalNFTContract.hasRole(
          ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE']),
          this.lender1
        );

        // When and Then
        expect(isMinter).to.be.equal(false);
      });
    });

    describe('Basic Minting', () => {
      it('only minter role should be able to mint a new NFT', async function () {
        await expectRevert(
          this.stakerMedalNFTContract
            .connect(this.lender1Signer)
            .mint(this.lender1, 1),
          'Must have minter role to mint'
        );
      });

      it('should revert with wrong staking type', async function () {
        await expectRevert(
          this.stakerMedalNFTContract
            .connect(this.seekerSigner)
            .mint(this.lender1, 4),
          'Staking ID not allowed, must be 1, 2 or 3'
        );
      });

      it('should get correct balance for lender1', async function () {
        await this.stakerMedalNFTContract
          .connect(this.seekerSigner)
          .mint(this.lender1, 1);

        const balance = await this.stakerMedalNFTContract.balanceOf(
          this.lender1,
          1
        );

        expect(balance.toString()).to.be.equal('1');
      });

      it('only admin should grant role to new account', async function () {
        await expectRevert(
          this.stakerMedalNFTContract
            .connect(this.lender1Signer)
            .grantRole(
              ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE']),
              this.lender1
            ),
          'AccessControl: sender must be an admin to grant'
        );
      });

      it('new minter should be able to mint a new NFT', async function () {
        await this.stakerMedalNFTContract
          .connect(this.deployerSigner)
          .grantRole(
            ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE']),
            this.lender1
          );
        await this.stakerMedalNFTContract
          .connect(this.lender1Signer)
          .mint(this.staker1, 2);
        const balance = await this.stakerMedalNFTContract.balanceOf(
          this.staker1,
          2
        );
        expect(balance.toString()).to.be.equal('1');
      });
    });

    describe('Basic Burning', () => {
      it('only minter role should be able to burn a new NFT', async function () {
        await expectRevert(
          this.stakerMedalNFTContract
            .connect(this.lender1Signer)
            .burn(this.lender1, 1),
          'Must have minter role to mint'
        );
      });

      it('should get correct balance for lender1', async function () {
        await this.stakerMedalNFTContract
          .connect(this.seekerSigner)
          .mint(this.lender1, 1);

        await this.stakerMedalNFTContract
          .connect(this.seekerSigner)
          .burn(this.lender1, 1);

        const balance = await this.stakerMedalNFTContract.balanceOf(
          this.lender1,
          1
        );

        expect(balance.toString()).to.be.equal('0');
      });


      it('should revert with wrong staking type', async function () {
        await expectRevert(
          this.stakerMedalNFTContract
            .connect(this.seekerSigner)
            .burn(this.lender1, 4),
          'Staking ID not allowed, must be 1, 2 or 3'
        );
      });

      it('new minter should be able to burn a new NFT', async function () {
        await this.stakerMedalNFTContract
          .connect(this.deployerSigner)
          .grantRole(
            ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE']),
            this.lender1
          );

        await this.stakerMedalNFTContract
          .connect(this.lender1Signer)
          .mint(this.staker1, 2);

        await this.stakerMedalNFTContract
          .connect(this.lender1Signer)
          .burn(this.staker1, 2);

        const balance = await this.stakerMedalNFTContract.balanceOf(
          this.staker1,
          2
        );
        expect(balance.toString()).to.be.equal('0');
      });
    });

    describe('Events', () => {
      it('on mint should emit event', async function () {
        const tx = await this.stakerMedalNFTContract
          .connect(this.seekerSigner)
          .mint(this.lender1, 1);

        // Correct Event.
        await expect(tx)
          .to.emit(this.stakerMedalNFTContract, 'TransferSingle')
          .withArgs(
            this.seeker,
            ethers.constants.AddressZero,
            this.lender1,
            1,
            1
          );
      });

      it('on burn should emit event', async function () {
        const tx1 = await this.stakerMedalNFTContract
          .connect(this.seekerSigner)
          .mint(this.lender1, 1);

        const tx2 = await this.stakerMedalNFTContract
          .connect(this.seekerSigner)
          .burn(this.lender1, 1);

        // Correct Event.
        await expect(tx2)
          .to.emit(this.stakerMedalNFTContract, 'TransferSingle')
          .withArgs(
            this.seeker,
            this.lender1,
            ethers.constants.AddressZero,
            1,
            1
          );
      });
    });

    describe('TransferFrom', () => {
      it('safeTransferFrom should revert', async function () {
        const dummyAddress = "0x664f6b4987d9db811867f431911124109ed5a475";

        await expectRevert(
          this.stakerMedalNFTContract
            .connect(this.deployerSigner)
            .safeTransferFrom(dummyAddress, dummyAddress, 1, 1, ethers.utils.formatBytes32String("")),
          'Method safeTransferFrom disabled'
        );
      });

      it('safeBatchTransferFrom should revert', async function () {
        const dummyAddress = "0x664f6b4987d9db811867f431911124109ed5a475";

        await expectRevert(
          this.stakerMedalNFTContract
            .connect(this.deployerSigner)
            .safeBatchTransferFrom(dummyAddress, dummyAddress, [], [], ethers.utils.formatBytes32String("")),
          'Method safeBatchTransferFrom disabled'
        );
      });
    });

    describe('Basic scenario', () => {
      it('should get correct balance for staker level 1', async function () {
        await this.stakerMedalNFTContract
          .connect(this.seekerSigner)
          .mint(this.lender1, 1);

        const balance = await this.stakerMedalNFTContract.balanceOf(
          this.lender1,
          1
        );

        const levelOfStaker = await this.stakerMedalNFTContract.getLevelOfStaker(this.lender1);

        expect(balance.toString()).to.be.equal('1');
        expect(levelOfStaker.toString()).to.be.equal('1');

        await expectRevert(
          this.stakerMedalNFTContract
            .connect(this.seekerSigner)
            .burn(this.lender1, 2),
          'ERC1155: burn amount exceeds balance'
        );

        await this.stakerMedalNFTContract
          .connect(this.seekerSigner)
          .burn(this.lender1, 1);

        const balanceAfter = await this.stakerMedalNFTContract.balanceOf(
          this.lender1,
          1
        );

        const levelOfStakerAfter = await this.stakerMedalNFTContract.getLevelOfStaker(this.lender1);

        expect(balanceAfter.toString()).to.be.equal('0');
        expect(levelOfStakerAfter.toString()).to.be.equal('0');

      });

      it('should get correct balance for staker level 2', async function () {
        await this.stakerMedalNFTContract
          .connect(this.seekerSigner)
          .mint(this.lender1, 2);

        const balance = await this.stakerMedalNFTContract.balanceOf(
          this.lender1,
          2
        );

        const levelOfStaker = await this.stakerMedalNFTContract.getLevelOfStaker(this.lender1);

        expect(balance.toString()).to.be.equal('1');
        expect(levelOfStaker.toString()).to.be.equal('2');

        await expectRevert(
          this.stakerMedalNFTContract
            .connect(this.seekerSigner)
            .burn(this.lender1, 1),
          'ERC1155: burn amount exceeds balance'
        );

        await this.stakerMedalNFTContract
          .connect(this.seekerSigner)
          .burn(this.lender1, 2);

        const balanceAfter = await this.stakerMedalNFTContract.balanceOf(
          this.lender1,
          2
        );

        const levelOfStakerAfter = await this.stakerMedalNFTContract.getLevelOfStaker(this.lender1);

        expect(balanceAfter.toString()).to.be.equal('0');
        expect(levelOfStakerAfter.toString()).to.be.equal('0');
      });

      it('should get correct balance for staker level 3', async function () {
        await this.stakerMedalNFTContract
          .connect(this.seekerSigner)
          .mint(this.lender1, 3);

        const balance = await this.stakerMedalNFTContract.balanceOf(
          this.lender1,
          3
        );

        const levelOfStaker = await this.stakerMedalNFTContract.getLevelOfStaker(this.lender1);

        expect(balance.toString()).to.be.equal('1');
        expect(levelOfStaker.toString()).to.be.equal('3');

        await expectRevert(
          this.stakerMedalNFTContract
            .connect(this.seekerSigner)
            .burn(this.lender1, 1),
          'ERC1155: burn amount exceeds balance'
        );

        await this.stakerMedalNFTContract
          .connect(this.seekerSigner)
          .burn(this.lender1, 3);

        const balanceAfter = await this.stakerMedalNFTContract.balanceOf(
          this.lender1,
          3
        );

        const levelOfStakerAfter = await this.stakerMedalNFTContract.getLevelOfStaker(this.lender1);

        expect(balanceAfter.toString()).to.be.equal('0');
        expect(levelOfStakerAfter.toString()).to.be.equal('0');
      });
    });


  });
}
