import {expect} from 'chai';
import {ethers, getNamedAccounts} from 'hardhat';
import {getSigners} from "../helpers/utils";
const {expectRevert} = require('@openzeppelin/test-helpers');

export default async function suite() {
  describe('ActionVerifier', async () => {
    it('check initial values', async function () {
      // Given and When
      const escrowAddress = await this.actionVerifierContract.escrow();
      const stakingAddress = await this.actionVerifierContract.staking();
      const rewardPerActionProvision = await this.actionVerifierContract.rewardPerActionProvision();
      const maxActionsPerProvision = await this.actionVerifierContract.maxActionsPerProvision();

      console.log(rewardPerActionProvision.toString(), maxActionsPerProvision.toString())
      // Then
      expect(this.escrowContract.address).to.be.equal(escrowAddress);
      expect(this.stakingContract.address).to.be.equal(stakingAddress);
      expect(rewardPerActionProvision.toNumber()).to.be.equal(10);
      expect(maxActionsPerProvision.toNumber()).to.be.equal(10);
    });
  })
}
