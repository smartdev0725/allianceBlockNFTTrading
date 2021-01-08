const Protocol = artifacts.require("Protocol");

describe("Protocol", function () {
  let accounts, protocol;

  before(async function () {
    accounts = await web3.eth.getAccounts();
  });

  describe("Initialize", function () {
    it("Should deploy contracts", async function () {
      protocol = await Protocol.new();
      assert.equal(await protocol.retrieve(), 0);
    });

    it("should update value", async function () {
      await protocol.store(100);
      assert.equal(await protocol.retrieve(), 100);
    });
  });
});
