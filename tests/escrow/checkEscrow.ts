import {expect} from 'chai';
import {ethers, getNamedAccounts} from 'hardhat';
import {getSigners} from "../helpers/utils";
const {expectRevert} = require('@openzeppelin/test-helpers');

export default async function suite() {
  describe('Funding NFT', async () => {
    it('when transfer funding nft', async function () {
      // Given
      const {seeker} = await getNamedAccounts();

      const loanId = 1;
      const partitionsToPurchase = ethers.utils.parseEther('1');
      const amount = ethers.utils.parseEther('1');

      // When
      await this.fundingNFTContract.mintGen0(this.escrowContract.address, amount, loanId);
      const escrowBalanceBefore = await this.fundingNFTContract.balanceOf(
        this.escrowContract.address,
        loanId
      );
      expect(escrowBalanceBefore.toString()).to.be.equal(amount.toString());
      await this.escrowContract.transferFundingNFT(loanId, partitionsToPurchase, seeker);

      // Then
      const escrowBalanceAfter = await this.fundingNFTContract.balanceOf(
        this.escrowContract.address,
        loanId
      );
      const seekerBalance = await this.fundingNFTContract.balanceOf(
        seeker,
        loanId
      );
      expect(escrowBalanceAfter.toNumber()).to.be.equal(0);
      expect(seekerBalance.toString()).to.be.equal(amount.toString());
    });

    it('when transfer funding nft without balance should revert', async function () {
      // Given
      const {seeker} = await getNamedAccounts();

      const loanId = 1;
      const partitionsToPurchase = ethers.utils.parseEther('1');

      // When and Then
      await expectRevert(
        this.escrowContract.transferFundingNFT(loanId, partitionsToPurchase, seeker),
        'ERC1155: insufficient balance for transfer'
      );
    });

    it('when transfer funding nft from another account not allowed should revert', async function () {
      // Given
      const {seeker} = await getNamedAccounts();

      // Get signers
      const {seekerSigner} = await getSigners();

      const loanId = 1;
      const partitionsToPurchase = ethers.utils.parseEther('1');
      const amount = ethers.utils.parseEther('1');

      // When and Then
      await this.fundingNFTContract.mintGen0(this.escrowContract.address, amount, loanId);
      const escrowBalanceBefore = await this.fundingNFTContract.balanceOf(
        this.escrowContract.address,
        loanId
      );
      expect(escrowBalanceBefore.toString()).to.be.equal(amount.toString());
      await expectRevert(
        this.escrowContract.connect(seekerSigner).transferFundingNFT(loanId, partitionsToPurchase, seeker),
        'Only Registry'
      );
    });

  })

  describe('Registry', async() => {
    it('when change registry from another account not allowed should revert', async function () {
      // Given
      const {seekerSigner} = await getSigners();

      // When and Then
      await expectRevert(
        this.escrowContract.connect(seekerSigner).changeRegistry(ethers.constants.AddressZero),
        'Ownable: caller is not the owner'
      );
    });

    it('when change registry from owner account should not revert', async function () {
      // Given
      const {deployerSigner} = await getSigners();

      // When
      await this.escrowContract.connect(deployerSigner).changeRegistry(ethers.constants.AddressZero)

      // Then
      const registryAddress = await this.escrowContract.registry();
      expect(registryAddress).to.be.equal(ethers.constants.AddressZero);
    });
  })

  describe('Collateral Token', async() => {
    it('when transfer collateral token', async function () {
      // Given
      const {seeker} = await getNamedAccounts();
      const { deployerSigner } = await getSigners();
      const amount = ethers.utils.parseEther('1');

      // When
      await this.collateralTokenContract.mint(this.escrowContract.address, amount);
      await this.escrowContract.connect(deployerSigner).transferCollateralToken(this.collateralTokenContract.address, seeker, amount);

      // Then
      const escrowBalance = await this.collateralTokenContract.balanceOf(this.escrowContract.address);
      const seekerBalance = await this.collateralTokenContract.balanceOf(seeker);
      expect(escrowBalance.toNumber()).to.be.equal(0);
      expect(seekerBalance.toString()).to.be.equal(amount.toString());
    });


    it('when transfer collateral token without balance should revert', async function () {
      // Given
      const {seeker} = await getNamedAccounts();
      const amount = ethers.utils.parseEther('1');

      // When and Then
      await expectRevert(
        this.escrowContract.transferCollateralToken(
          this.collateralTokenContract.address, seeker, amount
        ),
        'ERC20: transfer amount exceeds balance'
      );
    });

    it('when transfer collateral token from another account not allowed should revert', async function () {
      // Given
      const {seeker} = await getNamedAccounts();
      const {seekerSigner} = await getSigners();

      const amount = ethers.utils.parseEther('1');

      // When and Then
      await this.collateralTokenContract.mint(this.escrowContract.address, amount);

      await expectRevert(
        this.escrowContract.connect(seekerSigner).transferCollateralToken(this.collateralTokenContract.address, seeker, amount),
        'Only Registry'
      );
    });

  });

  describe('Lending Token', async() => {
    it('when transfer lending token', async function () {
      // Given
      const {seeker} = await getNamedAccounts();
      const { deployerSigner } = await getSigners();
      const amount = ethers.utils.parseEther('1');

      // When
      await this.lendingTokenContract.mint(this.escrowContract.address, amount);
      await this.escrowContract.connect(deployerSigner).transferLendingToken(seeker, amount);

      // Then
      const escrowBalance = await this.lendingTokenContract.balanceOf(this.escrowContract.address);
      const seekerBalance = await this.lendingTokenContract.balanceOf(seeker);
      expect(escrowBalance.toNumber()).to.be.equal(0);
      expect(seekerBalance.toString()).to.be.equal(amount.toString());
    });


    it('when transfer lending token without balance should revert', async function () {
      // Given
      const {seeker} = await getNamedAccounts();
      const amount = ethers.utils.parseEther('1');

      // When and Then
      await expectRevert(
        this.escrowContract.transferLendingToken(seeker, amount),
        'ERC20: transfer amount exceeds balance'
      );
    });

    it('when transfer lending token from another account not allowed should revert', async function () {
      // Given
      const {seeker} = await getNamedAccounts();
      const {seekerSigner} = await getSigners();

      const amount = ethers.utils.parseEther('1');

      // When and Then
      await this.lendingTokenContract.mint(this.escrowContract.address, amount);

      await expectRevert(
        this.escrowContract.connect(seekerSigner).transferLendingToken(seeker, amount),
        'Only Registry'
      );
    });

  });

  describe('multiMintReputationalToken', async() => {
    it('when mint reputational tokens with an invalid user should revert', async function () {
      // Given
      const {seekerSigner} = await getSigners();

      // When and Then
      await expectRevert(
        this.escrowContract.connect(seekerSigner).multiMintReputationalToken([], []),
        'Action Verifier'
      );
    });

    it('when mint reputational tokens with an invalid parameters should revert', async function () {
      // Given
      const {staker1Signer} = await getSigners();

      // When and Then
      await expectRevert(
        this.escrowContract.connect(staker1Signer).multiMintReputationalToken([1,2], [1, 1]),
        'invalid ENS name'
      );
    });

    it('when mint reputational tokens with an invalid parameters should revert', async function () {
      // Given
      const {lender1, lender2} = await getNamedAccounts();
      const {staker1Signer} = await getSigners();
      const amount = ethers.utils.parseEther('1');

      // When and Then
      await expectRevert(
        this.escrowContract.connect(staker1Signer).multiMintReputationalToken([lender1, lender2], [amount]),
        'Invalid length of to or amounts'
      );
    });
  })
}
