const LoanNFT = artifacts.require("LoanNFT");

const { constants, expectRevert } = require("@openzeppelin/test-helpers");

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

  describe("Minting", function () {
    it("only minter role should be able to mint a new NFT", async function () {
      await expectRevert(
        loanNFT.mint(alice, 1, 10, "0x", { from: random }),
        "must have minter role to mint"
      );
      await loanNFT.mint(alice, 1, 10, "0x", { from: admin });
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
      await loanNFT.mint(bob, 2, 20, "0x", { from: minter });
      const balance = await loanNFT.balanceOf(bob, 2);
      assert.equal(balance, 20);
    });

    it("should be able to query balances in batch", async function () {
      const balances = await loanNFT.balanceOfBatch([alice, bob], [1, 2]);

      assert.equal(balances[0], 10);
      assert.equal(balances[1], 20);
    });
  });
});
