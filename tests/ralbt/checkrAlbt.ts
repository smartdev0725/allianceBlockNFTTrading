import { ethers } from 'hardhat';
import {expect} from 'chai';

export default async function suite() {
  const name = "Reputational AllianceBlock Token";
  const symbol = "rALBT";
  const decimals = 18;

  describe('Succeeds', async function() {
    beforeEach(async function () {

    });

    describe("name", function() {
      it("should return", async function() {
        const nameReturned = await this.rALBTContract.name();
        expect(nameReturned).to.eq(name);
      });
    });

    describe("symbol", function() {
      it("should return", async function () {
        const symbolReturned = await this.rALBTContract.symbol();
        expect(symbolReturned).to.eq(symbol);
      });
    });

    describe("decimals", function() {
      it("should return", async function() {
        const decimalsReturned = await this.rALBTContract.decimals()
        expect(decimalsReturned).to.eq(decimals);
      });
    });
  });
}
