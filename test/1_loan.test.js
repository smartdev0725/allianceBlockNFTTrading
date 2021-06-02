const FundingNFT = artifacts.require('FundingNFT');

const {
  expectEvent,
  expectRevert,
  constants,
  BN,
} = require('@openzeppelin/test-helpers');
const {assert} = require('hardhat');

contract('LoanNFT', function () {
  let admin, alice, bob, minter, fundingNFT;

  describe('Loan Id and Generation', function () {
    it('only minter role should be able to mint gen0', async function () {
      await expectRevert(
        fundingNFT.mintGen0(alice, 10, 1, {from: random}),
        'must have minter role to mint'
      );
      const tx = await fundingNFT.mintGen0(alice, 10, 1, {from: admin});

      expectEvent(tx, 'TransferSingle', {
        operator: admin,
        from: constants.ZERO_ADDRESS,
        to: alice,
        id: new BN(3),
        value: new BN(10),
      });
    });

    it('should be able to increase loan generation', async function () {
      await expectRevert(
        fundingNFT.increaseGeneration(3, alice, 10, {from: random}),
        'caller is not owner nor approved'
      );

      const tx = await fundingNFT.increaseGeneration(3, alice, 10, {
        from: alice,
      });

      // Tokens burned
      expectEvent(tx, 'TransferSingle', {
        operator: alice,
        from: alice,
        to: constants.ZERO_ADDRESS,
        id: new BN(3),
        value: new BN(10),
      });

      // New Gen Tokens minted
      expectEvent(tx, 'TransferSingle', {
        operator: alice,
        from: constants.ZERO_ADDRESS,
        to: alice,
        value: new BN(10),
      });

      const newTokenId = String(tx.logs[1].args.id);
      const {generation, loanId} = await fundingNFT.formatTokenId(newTokenId);

      assert.equal(generation, 1);
      assert.equal(loanId, 3);
    });

    it('should get correct balance for alice', async function () {
      const balanceGen0 = await fundingNFT.balanceOf(alice, 3);

      const tokenId = await fundingNFT.getTokenId(1, 3);
      const balanceGen1 = await fundingNFT.balanceOf(alice, tokenId);

      assert.equal(balanceGen0, 0);
      assert.equal(balanceGen1, 10);
    });
  });

  describe('Token Pausing', function () {
    it('only pauser role should be able to pause token transfers', async function () {
      await expectRevert(
        fundingNFT.pauseTokenTransfer(3, {from: random}),
        'must have pauser role'
      );
      await fundingNFT.pauseTokenTransfer(3, {from: admin});
    });

    it('should revert when transfering a paused token', async function () {
      const tokenId = await fundingNFT.getTokenId(1, 3);

      await expectRevert(
        fundingNFT.safeTransferFrom(alice, bob, tokenId, 10, '0x', {
          from: alice,
        }),
        'Transfers paused'
      );
    });

    it('should revert when increasing token generation of paused token', async function () {
      const tokenId = await fundingNFT.getTokenId(1, 3);

      await expectRevert(
        fundingNFT.increaseGeneration(tokenId, alice, 10, {
          from: alice,
        }),
        'Transfers paused'
      );
    });

    it('should revert when user tries to burn a paused token', async function () {
      const tokenId = await fundingNFT.getTokenId(1, 3);

      await expectRevert(
        fundingNFT.burn(alice, tokenId, 10, {
          from: alice,
        }),
        'Transfers paused'
      );
    });
  });
});
