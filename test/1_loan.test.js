const FundingNFT = artifacts.require("FundingNFT");

const {
  expectEvent,
  expectRevert,
  constants,
  BN,
} = require("@openzeppelin/test-helpers");
const { assert } = require("hardhat");

contract("LoanNFT", function () {
  let admin, alice, bob, minter, fundingNFT;

  before(async function () {
    [admin, alice, bob, minter, random] = await web3.eth.getAccounts();
    fundingNFT = await FundingNFT.new();
  });

  describe("Initial Values", function () {
    it("should get correct contract uri", async function () {
      const contractURI = await fundingNFT.contractURI();
      assert.equal(contractURI, "https://allianceblock.io/");
    });

    it("should get correct role keys", async function () {
      const MINTER_ROLE = await fundingNFT.MINTER_ROLE();
      const PAUSER_ROLE = await fundingNFT.PAUSER_ROLE();
      const DEFAULT_ADMIN_ROLE = await fundingNFT.DEFAULT_ADMIN_ROLE();

      assert.equal(MINTER_ROLE, web3.utils.soliditySha3("MINTER_ROLE"));
      assert.equal(PAUSER_ROLE, web3.utils.soliditySha3("PAUSER_ROLE"));
      assert.equal(
        DEFAULT_ADMIN_ROLE,
        web3.eth.abi.encodeParameter("uint256", "0") // "0x0"
      );
    });

    it("should get correct role status for admin", async function () {
      const isMinter = await fundingNFT.hasRole(
        web3.utils.soliditySha3("MINTER_ROLE"),
        admin
      );
      const isPauser = await fundingNFT.hasRole(
        web3.utils.soliditySha3("PAUSER_ROLE"),
        admin
      );
      const isAdmin = await fundingNFT.hasRole("0x0", admin);

      assert(isAdmin);
      assert(isMinter);
      assert(isPauser);
    });

    it("should get correct role status for random address", async function () {
      const isMinter = await fundingNFT.hasRole(
        web3.utils.soliditySha3("MINTER_ROLE"),
        random
      );
      const isPauser = await fundingNFT.hasRole(
        web3.utils.soliditySha3("PAUSER_ROLE"),
        random
      );
      const isAdmin = await fundingNFT.hasRole("0x0", random);

      assert(!isAdmin);
      assert(!isMinter);
      assert(!isPauser);
    });

    it("should get correct interface support", async function () {
      const supportERC1155 = await fundingNFT.supportsInterface("0xd9b67a26");
      const supportMetadata = await fundingNFT.supportsInterface("0x0e89341c");

      assert(supportERC1155);
      assert(supportMetadata);
    });
  });

  describe("Basic Minting", function () {
    it("only minter role should be able to mint a new NFT", async function () {
      await expectRevert(
        fundingNFT.mintGen0(alice, 10, 1, { from: random }),
        "must have minter role to mint"
      );
      await fundingNFT.mintGen0(alice, 10, 1, { from: admin });
    });

    it("should get correct balance for alice", async function () {
      const balance = await fundingNFT.balanceOf(alice, 1);
      assert.equal(balance, 10);
    });

    it("only admin should grant role to new account", async function () {
      await expectRevert(
        fundingNFT.grantRole(web3.utils.soliditySha3("MINTER_ROLE"), minter, {
          from: random,
        }),
        "AccessControl: sender must be an admin to grant"
      );
      await fundingNFT.grantRole(web3.utils.soliditySha3("MINTER_ROLE"), minter, {
        from: admin,
      });
    });

    it("new minter should be able to mint a new NFT", async function () {
      await fundingNFT.mintGen0(bob, 20, 1, { from: minter });
      const balance = await fundingNFT.balanceOf(bob, 2);
      assert.equal(balance, 20);
    });

    it("should be able to query balances in batch", async function () {
      const balances = await fundingNFT.balanceOfBatch([alice, bob], [1, 2]);

      assert.equal(balances[0], 10);
      assert.equal(balances[1], 20);
    });
  });

  describe("Loan Id and Generation", function () {
    it("only minter role should be able to mint gen0", async function () {
      await expectRevert(
        fundingNFT.mintGen0(alice, 10, 1,{ from: random }),
        "must have minter role to mint"
      );
      const tx = await fundingNFT.mintGen0(alice, 10, 1, { from: admin });

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
        fundingNFT.increaseGeneration(3, alice, 10, { from: random }),
        "caller is not owner nor approved"
      );

      const tx = await fundingNFT.increaseGeneration(3, alice, 10, {
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
      const { generation, loanId } = await fundingNFT.formatTokenId(newTokenId);

      assert.equal(generation, 1);
      assert.equal(loanId, 3);
    });

    it("should get correct balance for alice", async function () {
      const balanceGen0 = await fundingNFT.balanceOf(alice, 3);

      const tokenId = await fundingNFT.getTokenId(1, 3);
      const balanceGen1 = await fundingNFT.balanceOf(alice, tokenId);

      assert.equal(balanceGen0, 0);
      assert.equal(balanceGen1, 10);
    });
  });

  describe("Token Pausing", function () {
    it("only pauser role should be able to pause token transfers", async function () {
      await expectRevert(
        fundingNFT.pauseTokenTransfer(3, { from: random }),
        "must have pauser role"
      );
      await fundingNFT.pauseTokenTransfer(3, { from: admin });
    });

    it("should revert when transfering a paused token", async function () {
      const tokenId = await fundingNFT.getTokenId(1, 3);

      await expectRevert(
        fundingNFT.safeTransferFrom(alice, bob, tokenId, 10, "0x", {
          from: alice,
        }),
        "Transfers paused"
      );
    });

    it("should revert when increasing token generation of paused token", async function () {
      const tokenId = await fundingNFT.getTokenId(1, 3);

      await expectRevert(
        fundingNFT.increaseGeneration(tokenId, alice, 10, {
          from: alice,
        }),
        "Transfers paused"
      );
    });

    it("should revert when user tries to burn a paused token", async function () {
      const tokenId = await fundingNFT.getTokenId(1, 3);

      await expectRevert(
        fundingNFT.burn(alice, tokenId, 10, {
          from: alice,
        }),
        "Transfers paused"
      );
    });
  });
});
