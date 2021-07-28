import {expect} from 'chai';
import {ethers, getNamedAccounts} from 'hardhat';
import {getSigners} from '../helpers/utils';
const {expectRevert} = require('@openzeppelin/test-helpers');

export default async function suite() {
  describe('FundingNFT', async () => {
    // it('When initialize again should revert', async function () {
    //   const actionVerifierAddress =
    //     '0x664f6b4987d9db811867f431911124109ed5a475';
    //   const stakingAddress = '0x664f6b4987d9db811867f431911124109ed5a475';

    //   await expectRevert(
    //     this.escrowContract.afterInitialize(
    //       actionVerifierAddress,
    //       stakingAddress
    //     ),
    //     'Cannot initialize second time'
    //   );
    // });

    it('When initialize with zero address should revert', async function () {
      await expectRevert(
        this.escrowContract.afterInitialize(
          ethers.constants.AddressZero,
          ethers.constants.AddressZero
        ),
        'Cannot initialize with 0 addresses'
      );
    });

    it('when transfer funding nft', async function () {
      // Given
      const {seeker} = await getNamedAccounts();

      const investmentId = 1;
      const partitionsToPurchase = ethers.utils.parseEther('1');
      const amount = ethers.utils.parseEther('1');

      // When
      await this.fundingNFTContract.mintGen0(
        this.escrowContract.address,
        amount,
        investmentId
      );
      const escrowBalanceBefore = await this.fundingNFTContract.balanceOf(
        this.escrowContract.address,
        investmentId
      );
      expect(escrowBalanceBefore.toString()).to.be.equal(amount.toString());
      await this.escrowContract.transferFundingNFT(
        investmentId,
        partitionsToPurchase,
        seeker
      );

      // Then
      const escrowBalanceAfter = await this.fundingNFTContract.balanceOf(
        this.escrowContract.address,
        investmentId
      );
      const seekerBalance = await this.fundingNFTContract.balanceOf(
        seeker,
        investmentId
      );
      expect(escrowBalanceAfter.toNumber()).to.be.equal(0);
      expect(seekerBalance.toString()).to.be.equal(amount.toString());
    });

    it('when transfer funding nft without balance should revert', async function () {
      // Given
      const {seeker} = await getNamedAccounts();

      const investmentId = 1;
      const partitionsToPurchase = ethers.utils.parseEther('1');

      // When and Then
      await expectRevert(
        this.escrowContract.transferFundingNFT(
          investmentId,
          partitionsToPurchase,
          seeker
        ),
        'ERC1155: insufficient balance for transfer'
      );
    });

    it('when transfer funding nft from another account not allowed should revert', async function () {
      // Given
      const {seeker} = await getNamedAccounts();

      // Get signers
      const {seekerSigner} = await getSigners();

      const investmentId = 1;
      const partitionsToPurchase = ethers.utils.parseEther('1');
      const amount = ethers.utils.parseEther('1');

      // When and Then
      await this.fundingNFTContract.mintGen0(
        this.escrowContract.address,
        amount,
        investmentId
      );
      const escrowBalanceBefore = await this.fundingNFTContract.balanceOf(
        this.escrowContract.address,
        investmentId
      );
      expect(escrowBalanceBefore.toString()).to.be.equal(amount.toString());
      await expectRevert(
        this.escrowContract
          .connect(seekerSigner)
          .transferFundingNFT(investmentId, partitionsToPurchase, seeker),
        'Only Project or Owner'
      );
    });
  });

  // describe('Investment', async () => {
  //   it('when change investment from another account not allowed should revert', async function () {
  //     // Given
  //     const {seekerSigner} = await getSigners();

  //     // When and Then
  //     await expectRevert(
  //       this.escrowContract
  //         .connect(seekerSigner)
  //         .changeInvestment(ethers.constants.AddressZero),
  //       'Ownable: caller is not the owner'
  //     );
  //   });

  //   it('when change investment with zero address should not revert', async function () {
  //     // Given
  //     const {deployerSigner} = await getSigners();
  //     // When and Then
  //     await expectRevert(
  //       this.escrowContract
  //         .connect(deployerSigner)
  //         .changeInvestment(ethers.constants.AddressZero),
  //       'Investment should not be zero address'
  //     );
  //   });

  //   it('when change investment from owner account should not revert', async function () {
  //     // Given
  //     const {deployerSigner} = await getSigners();
  //     const dummyAddress = '0x664f6b4987d9db811867f431911124109ed5a475';

  //     // When
  //     await this.escrowContract
  //       .connect(deployerSigner)
  //       .changeInvestment(dummyAddress);

  //     // Then
  //     const investmentAddress = await this.escrowContract.investment();
  //     expect(investmentAddress.toLowerCase()).to.be.equal(
  //       dummyAddress.toLowerCase()
  //     );
  //   });
  // });

  describe('Collateral Token', async () => {
    it('when transfer collateral token', async function () {
      // Given
      const {seeker} = await getNamedAccounts();
      const {deployerSigner} = await getSigners();
      const amount = ethers.utils.parseEther('1');

      // When
      await this.collateralTokenContract.mint(
        this.escrowContract.address,
        amount
      );
      await this.escrowContract
        .connect(deployerSigner)
        .transferInvestmentToken(
          this.collateralTokenContract.address,
          seeker,
          amount
        );

      // Then
      const escrowBalance = await this.collateralTokenContract.balanceOf(
        this.escrowContract.address
      );
      const seekerBalance = await this.collateralTokenContract.balanceOf(
        seeker
      );
      expect(escrowBalance.toNumber()).to.be.equal(0);
      expect(seekerBalance.toString()).to.be.equal(amount.toString());
    });

    it('when transfer collateral token without balance should revert', async function () {
      // Given
      const {seeker} = await getNamedAccounts();
      const amount = ethers.utils.parseEther('1');

      // When and Then
      await expectRevert(
        this.escrowContract.transferInvestmentToken(
          this.collateralTokenContract.address,
          seeker,
          amount
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
      await this.collateralTokenContract.mint(
        this.escrowContract.address,
        amount
      );

      await expectRevert(
        this.escrowContract
          .connect(seekerSigner)
          .transferInvestmentToken(
            this.collateralTokenContract.address,
            seeker,
            amount
          ),
        'Only Project'
      );
    });
  });

  describe('Lending Token', async () => {
    it('when transfer lending token', async function () {
      // Given
      const {seeker} = await getNamedAccounts();
      const {deployerSigner} = await getSigners();
      const amount = ethers.utils.parseEther('1');

      // When
      await this.lendingTokenContract.mint(this.escrowContract.address, amount);
      await this.escrowContract
        .connect(deployerSigner)
        .transferLendingToken(
          this.lendingTokenContract.address,
          seeker,
          amount
        );

      // Then
      const escrowBalance = await this.lendingTokenContract.balanceOf(
        this.escrowContract.address
      );
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
        this.escrowContract.transferLendingToken(
          this.lendingTokenContract.address,
          seeker,
          amount
        ),
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
        this.escrowContract
          .connect(seekerSigner)
          .transferLendingToken(
            this.lendingTokenContract.address,
            seeker,
            amount
          ),
        'Only Project'
      );
    });
  });

  describe('multiMintReputationalToken', async () => {
    it('when mint reputational tokens with an invalid user should revert', async function () {
      // Given
      const {seekerSigner} = await getSigners();

      // When and Then
      await expectRevert(
        this.escrowContract
          .connect(seekerSigner)
          .multiMintReputationalToken([], []),
        'Action Verifier'
      );
    });

    it('when mint reputational tokens with an invalid parameters should revert', async function () {
      // Given
      const {staker1Signer} = await getSigners();

      // When and Then
      await expectRevert(
        this.escrowContract
          .connect(staker1Signer)
          .multiMintReputationalToken([1, 2], [1, 1]),
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
        this.escrowContract
          .connect(staker1Signer)
          .multiMintReputationalToken([lender1, lender2], [amount]),
        'Invalid length of to or amounts'
      );
    });

    it('when mint reputational tokens should success', async function () {
      // Given
      const {lender1, lender2} = await getNamedAccounts();
      const {staker1Signer} = await getSigners();
      const amount = ethers.utils.parseEther('1');

      // When
      await this.escrowContract
        .connect(staker1Signer)
        .multiMintReputationalToken([lender1, lender2], [amount, amount]);

      // Then
      const balanceLender1 = await this.rALBTContract.balanceOf(lender1);
      const balanceLender2 = await this.rALBTContract.balanceOf(lender2);

      expect(balanceLender1.toString()).to.be.equal(amount.toString());
      expect(balanceLender2.toString()).to.be.equal(amount.toString());
    });
  });

  describe('mintReputationalToken', async () => {
    it('when mint reputational tokens with an invalid user should revert', async function () {
      // Given
      const {lender1} = await getNamedAccounts();
      const {seekerSigner} = await getSigners();
      const amount = ethers.utils.parseEther('1');

      // When and Then
      await expectRevert(
        this.escrowContract
          .connect(seekerSigner)
          .mintReputationalToken(lender1, amount),
        'Only Project or Staking'
      );
    });

    it('when mint reputational tokens should success', async function () {
      // Given
      const {lender1} = await getNamedAccounts();
      const {staker2Signer} = await getSigners();
      const amount = ethers.utils.parseEther('1');

      // When
      await this.escrowContract
        .connect(staker2Signer)
        .mintReputationalToken(lender1, amount);

      // Then
      const balanceLender1 = await this.rALBTContract.balanceOf(lender1);
      expect(balanceLender1.toString()).to.be.equal(amount.toString());
    });
  });

  describe('burnReputationalToken', async () => {
    it('when burn reputational tokens with an invalid user should revert', async function () {
      // Given
      const {lender1} = await getNamedAccounts();
      const {seekerSigner} = await getSigners();
      const amount = ethers.utils.parseEther('1');

      // When and Then
      await expectRevert(
        this.escrowContract
          .connect(seekerSigner)
          .burnReputationalToken(lender1, amount),
        'Only Staking'
      );
    });

    it('when burn reputational tokens should success', async function () {
      // Given
      const {lender1} = await getNamedAccounts();
      const {staker2Signer} = await getSigners();
      const amount = ethers.utils.parseEther('1');

      // When
      await this.escrowContract
        .connect(staker2Signer)
        .mintReputationalToken(lender1, amount);

      // Then
      const balanceLender1 = await this.rALBTContract.balanceOf(lender1);
      expect(balanceLender1.toString()).to.be.equal(amount.toString());

      await this.escrowContract
        .connect(staker2Signer)
        .burnReputationalToken(lender1, amount);
      const balanceLender1AfterBurn = await this.rALBTContract.balanceOf(
        lender1
      );
      expect(balanceLender1AfterBurn.toNumber()).to.be.equal(0);
    });
  });

  describe('burn funding token', async () => {
    it('when burn funding token with an invalid user should revert', async function () {
      // Given
      const {lender1} = await getNamedAccounts();
      const {seekerSigner} = await getSigners();
      const amount = ethers.utils.parseEther('1');

      // When and Then
      await expectRevert(
        this.escrowContract
          .connect(seekerSigner)
          .burnFundingNFT(lender1, 1, amount),
        'Only Project'
      );
    });

    it('when burn funding tokens should success', async function () {
      // Given and When
      const {lender1, staker1, deployer} = await getNamedAccounts();
      const {deployerSigner, lender1Signer, staker2Signer} = await getSigners();

      await this.fundingNFTContract
        .connect(deployerSigner)
        .grantRole(
          ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE']),
          lender1
        );
      await this.fundingNFTContract
        .connect(deployerSigner)
        .grantRole(
          ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE']),
          this.escrowContract.address
        );

      await this.fundingNFTContract
        .connect(lender1Signer)
        .mintGen0(staker1, 20, 1);
      const balance = await this.fundingNFTContract.balanceOf(staker1, 1);

      expect(balance.toString()).to.be.equal('20');

      // Then
      await this.escrowContract
        .connect(deployerSigner)
        .burnFundingNFT(staker1, 1, 20);
      const balanceAfterBurn = await this.fundingNFTContract.balanceOf(
        staker1,
        1
      );
      expect(balanceAfterBurn.toNumber()).to.be.equal(0);
    });
  });
}
