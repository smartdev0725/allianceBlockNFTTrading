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

      // Then
      expect(this.escrowContract.address).to.be.equal(escrowAddress);
      expect(this.stakingContract.address).to.be.equal(stakingAddress);
      expect(rewardPerActionProvision.toNumber()).to.be.equal(10);
      expect(maxActionsPerProvision.toNumber()).to.be.equal(10);
    });

    it('Should revert when update variables with another user', async function () {
      await expectRevert(
        this.actionVerifierContract.connect(this.seekerSigner).updateVariables(5, 10),
        'Ownable: caller is not the owner'
      );
    });

    it('Update variables', async function () {
      // Given and When
      await this.actionVerifierContract.connect(this.deployerSigner).updateVariables(5, 10)

      // Then
      const rewardPerActionProvision = await this.actionVerifierContract.rewardPerActionProvision();
      const maxActionsPerProvision = await this.actionVerifierContract.maxActionsPerProvision();
      expect(rewardPerActionProvision.toNumber()).to.be.equal(5);
      expect(maxActionsPerProvision.toNumber()).to.be.equal(10);
    });

    it('Should revert when import action with another user', async function () {
      await expectRevert(
        this.actionVerifierContract.connect(this.seekerSigner).importAction('Test', 10),
        'Ownable: caller is not the owner'
      );
    });

    it('Should import action', async function () {
      // Given and When
      await this.actionVerifierContract.connect(this.deployerSigner).importAction("Action", 10)

      // Then
      const action = ethers.utils.keccak256(ethers.utils.solidityPack([ "string" ], [ "Action" ]))
      const rewardPerAction = await this.actionVerifierContract.rewardPerAction(action)
      expect(rewardPerAction.toNumber()).to.be.equal(10);
    });

  })
}
