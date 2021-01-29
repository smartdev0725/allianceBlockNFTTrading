const LoanNFT = artifacts.require("LoanNFT");

const {
  expectEvent,
  expectRevert,
  constants,
  BN,
} = require("@openzeppelin/test-helpers");
const { assert } = require("hardhat");

contract("LoanNFT", function () {
  let admin, alice, bob, minter, loanNFT;

  before(async function () {
    [admin, alice, bob, minter, random] = await web3.eth.getAccounts();
    loanNFT = await LoanNFT.new();
  });

  describe("Initial Values", function () {
    it("should get correct contract uri", async function () {
      const contractURI = await loanNFT.contractURI();
      assert.equal(contractURI, "https://allianceblock.io/");
    });

    it("should get correct role keys", async function () {
      const MINTER_ROLE = await loanNFT.MINTER_ROLE();
      const PAUSER_ROLE = await loanNFT.PAUSER_ROLE();
      const DEFAULT_ADMIN_ROLE = await loanNFT.DEFAULT_ADMIN_ROLE();

      assert.equal(MINTER_ROLE, web3.utils.soliditySha3("MINTER_ROLE"));
      assert.equal(PAUSER_ROLE, web3.utils.soliditySha3("PAUSER_ROLE"));
      assert.equal(
        DEFAULT_ADMIN_ROLE,
        web3.eth.abi.encodeParameter("uint256", "0") // "0x0"
      );
    });

    it("should get correct role status for admin", async function () {
      const isMinter = await loanNFT.hasRole(
        web3.utils.soliditySha3("MINTER_ROLE"),
        admin
      );
      const isPauser = await loanNFT.hasRole(
        web3.utils.soliditySha3("PAUSER_ROLE"),
        admin
      );
      const isAdmin = await loanNFT.hasRole("0x0", admin);

      assert(isAdmin);
      assert(isMinter);
      assert(isPauser);
    });

    it("should get correct role status for random address", async function () {
      const isMinter = await loanNFT.hasRole(
        web3.utils.soliditySha3("MINTER_ROLE"),
        random
      );
      const isPauser = await loanNFT.hasRole(
        web3.utils.soliditySha3("PAUSER_ROLE"),
        random
      );
      const isAdmin = await loanNFT.hasRole("0x0", random);

      assert(!isAdmin);
      assert(!isMinter);
      assert(!isPauser);
    });

    it("should get correct interface support", async function () {
      const supportERC1155 = await loanNFT.supportsInterface("0xd9b67a26");
      const supportMetadata = await loanNFT.supportsInterface("0x0e89341c");

      assert(supportERC1155);
      assert(supportMetadata);
    });
  });

  describe("Basic Minting", function () {
    it("only minter role should be able to mint a new NFT", async function () {
      await expectRevert(
        loanNFT.mintGen0(alice, 10, { from: random }),
        "must have minter role to mint"
      );
      await loanNFT.mintGen0(alice, 10, { from: admin });
    });

    it("should get correct balance for alice", async function () {
      const balance = await loanNFT.balanceOf(alice, 1);
      assert.equal(balance, 10);
    });

    it("only admin should grant role to new account", async function () {
      await expectRevert(
        loanNFT.grantRole(web3.utils.soliditySha3("MINTER_ROLE"), minter, {
          from: random,
        }),
        "AccessControl: sender must be an admin to grant"
      );
      await loanNFT.grantRole(web3.utils.soliditySha3("MINTER_ROLE"), minter, {
        from: admin,
      });
    });

    it("new minter should be able to mint a new NFT", async function () {
      await loanNFT.mintGen0(bob, 20, { from: minter });
      const balance = await loanNFT.balanceOf(bob, 2);
      assert.equal(balance, 20);
    });

    it("should be able to query balances in batch", async function () {
      const balances = await loanNFT.balanceOfBatch([alice, bob], [1, 2]);

      assert.equal(balances[0], 10);
      assert.equal(balances[1], 20);
    });
  });

  describe("Loan Id and Generation", function () {
    it("only minter role should be able to mint gen0", async function () {
      await expectRevert(
        loanNFT.mintGen0(alice, 10, { from: random }),
        "must have minter role to mint"
      );
      const tx = await loanNFT.mintGen0(alice, 10, { from: admin });

      expectEvent(tx, "TransferSingle", {
        operator: admin,
        from: constants.ZERO_ADDRESS,
        to: alice,
        id: new BN(3),
        value: new BN(10),
      });
    });

    it("should be able to increase loan generation", async function () {
      await expectRevert(
        loanNFT.increaseGeneration(3, alice, 10, { from: random }),
        "caller is not owner nor approved"
      );

      const tx = await loanNFT.increaseGeneration(3, alice, 10, {
        from: alice,
      });

      // Tokens burned
      expectEvent(tx, "TransferSingle", {
        operator: alice,
        from: alice,
        to: constants.ZERO_ADDRESS,
        id: new BN(3),
        value: new BN(10),
      });

      // New Gen Tokens minted
      expectEvent(tx, "TransferSingle", {
        operator: alice,
        from: constants.ZERO_ADDRESS,
        to: alice,
        value: new BN(10),
      });

      const newTokenId = String(tx.logs[1].args.id);
      const { generation, loanId } = await loanNFT.formatTokenId(newTokenId);

      assert.equal(generation, 1);
      assert.equal(loanId, 3);
    });

    it("should get correct balance for alice", async function () {
      const balanceGen0 = await loanNFT.balanceOf(alice, 3);

      const tokenId = await loanNFT.getTokenId(1, 3);
      const balanceGen1 = await loanNFT.balanceOf(alice, tokenId);

      assert.equal(balanceGen0, 0);
      assert.equal(balanceGen1, 10);
    });
  });

  describe("Token Pausing", function () {
    it("only pauser role should be able to pause token transfers", async function () {
      await expectRevert(
        loanNFT.pauseTokenTransfer(3, { from: random }),
        "must have pauser role"
      );
      await loanNFT.pauseTokenTransfer(3, { from: admin });
    });

    it("should revert when transfering a paused token", async function () {
      const tokenId = await loanNFT.getTokenId(1, 3);

      await expectRevert(
        loanNFT.safeTransferFrom(alice, bob, tokenId, 10, "0x", {
          from: alice,
        }),
        "Transfers paused"
      );
    });

    it("should revert when increasing token generation of paused token", async function () {
      const tokenId = await loanNFT.getTokenId(1, 3);

      await expectRevert(
        loanNFT.increaseGeneration(tokenId, alice, 10, {
          from: alice,
        }),
        "Transfers paused"
      );
    });

    it("should revert when user tries to burn a paused token", async function () {
      const tokenId = await loanNFT.getTokenId(1, 3);

      await expectRevert(
        loanNFT.burn(alice, tokenId, 10, {
          from: alice,
        }),
        "Transfers paused"
      );
    });
  });
});
