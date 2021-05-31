import {expect} from 'chai';
import {ethers, getNamedAccounts} from 'hardhat';
import {getSigners} from "../helpers/utils";
const {expectRevert} = require('@openzeppelin/test-helpers');

export default async function suite() {
  describe('Succeeds', async () => {
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
      const amount = ethers.utils.parseEther('1');

      // When and Then
      await expectRevert(
        this.escrowContract.transferFundingNFT(loanId, partitionsToPurchase, seeker),
        'ERC1155: insufficient balance for transfer'
      );
    });


    it('when transfer from another account not allowed should revert', async function () {
      // Given
      const {seeker} = await getNamedAccounts();

      // Get signers
      const { seekerSigner } = await getSigners();

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
  });
}
