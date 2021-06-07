import {expect} from 'chai';
import {ethers, getNamedAccounts} from 'hardhat';
import {StakingType} from '../helpers/registryEnums';
const {expectRevert} = require('@openzeppelin/test-helpers');

export default async function suite() {
  describe('ActionVerifier', async () => {
    const signatures = [
      '0x951663526a6d560d2a96eb59a186c154bc5366ceae61689736199047e936cff3308e6528c95cfba26b55721c6ccd95e7df59d955a3236b2ecb25e1fbbda012c31c',
      '0xde3ff46a7d2e34a664324563ad97be5bb2a75b8d417d6744963469d9d8e58439019856215da25c025b7f718c45ee036cd94301fbfbd1ef4197691bd4ce1ad9351b',
      '0xa9573ad90d30822f8bdac4c8d3bad1a55639adbc49594e7d33b7fb19ac8b7294392ddae15e0fb731d626f213cf9f8770929e7648971e4f1c4eccc5fc41a20f711b',
      '0xd91ea32c92ece14087cac527de74eb4e86da9f01ca2a0b221b9d5f550de20bd11e4e0efa1caed3d85f8054baec6c11bf535999fe793428b68ec7c84b44bfea7d1c',
      '0x03c9c51fb493bfccc3779df3d7f5aadce98fb3ab738da7e763e75d769ce6efbd7c8e6701f3db7c28bb1f12123595b989097caf58e76f93a203fc24287741b9561c',
    ];

    const actions = [
      {
        account: '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955',
        actionName: 'Project Vote',
        answer: 'Yes',
        referralId: '5',
      },
      {
        account: '0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f',
        actionName: 'Project Vote',
        answer: 'No',
        referralId: '3',
      },
      {
        account: '0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f',
        actionName: 'Create Thread',
        answer: 'Project Analysis',
        referralId: '3',
      },
      {
        account: '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720',
        actionName: 'Create Thread',
        answer: 'Project Analysis',
        referralId: '2',
      },
      {
        account: '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720',
        actionName: 'Project Vote',
        answer: 'Yes',
        referralId: '2',
      },
    ];

    it('check initial values', async function () {
      // Given and When
      const escrowAddress = await this.actionVerifierContract.escrow();
      const stakingAddress = await this.actionVerifierContract.staking();
      const rewardPerActionProvision =
        await this.actionVerifierContract.rewardPerActionProvision();
      const maxActionsPerProvision =
        await this.actionVerifierContract.maxActionsPerProvision();

      // Then
      expect(this.escrowContract.address).to.be.equal(escrowAddress);
      expect(this.stakingContract.address).to.be.equal(stakingAddress);
      expect(rewardPerActionProvision.toNumber()).to.be.equal(10);
      expect(maxActionsPerProvision.toNumber()).to.be.equal(10);
    });

    it('Should revert when update variables with another user', async function () {
      await expectRevert(
        this.actionVerifierContract
          .connect(this.seekerSigner)
          .updateVariables(5, 10),
        'Ownable: caller is not the owner'
      );
    });

    it('Update variables', async function () {
      // Given and When
      await this.actionVerifierContract
        .connect(this.deployerSigner)
        .updateVariables(5, 10);

      // Then
      const rewardPerActionProvision =
        await this.actionVerifierContract.rewardPerActionProvision();
      const maxActionsPerProvision =
        await this.actionVerifierContract.maxActionsPerProvision();
      expect(rewardPerActionProvision.toNumber()).to.be.equal(5);
      expect(maxActionsPerProvision.toNumber()).to.be.equal(10);
    });

    it('Should revert when import action with another user', async function () {
      await expectRevert(
        this.actionVerifierContract
          .connect(this.seekerSigner)
          .importAction('Test', 10),
        'Ownable: caller is not the owner'
      );
    });

    it('Should import action', async function () {
      // Given and When
      await this.actionVerifierContract
        .connect(this.deployerSigner)
        .importAction('Action', 10);

      // Then
      const action = ethers.utils.keccak256(
        ethers.utils.solidityPack(['string'], ['Action'])
      );
      const rewardPerAction = await this.actionVerifierContract.rewardPerAction(
        action
      );
      expect(rewardPerAction.toNumber()).to.be.equal(10);
    });

    it('Should revert when update action with another user', async function () {
      await expectRevert(
        this.actionVerifierContract
          .connect(this.seekerSigner)
          .updateAction('Test', 10),
        'Ownable: caller is not the owner'
      );
    });

    it('Should update action', async function () {
      // Given and When
      await this.actionVerifierContract
        .connect(this.deployerSigner)
        .importAction('Action', 10);

      // Then
      const action = ethers.utils.keccak256(
        ethers.utils.solidityPack(['string'], ['Action'])
      );
      const rewardPerActionBefore =
        await this.actionVerifierContract.rewardPerAction(action);
      expect(rewardPerActionBefore.toNumber()).to.be.equal(10);

      await this.actionVerifierContract
        .connect(this.deployerSigner)
        .updateAction('Action', 20);
      const rewardPerActionAfter =
        await this.actionVerifierContract.rewardPerAction(action);
      expect(rewardPerActionAfter.toNumber()).to.be.equal(20);
    });

    it('Check for an existing action for true', async function () {
      // Given and When
      await this.actionVerifierContract
        .connect(this.deployerSigner)
        .importAction('Action', 10);

      // Then
      const action = ethers.utils.keccak256(
        ethers.utils.solidityPack(['string'], ['Action'])
      );
      const rewardPerActionBefore =
        await this.actionVerifierContract.rewardPerAction(action);
      expect(rewardPerActionBefore.toNumber()).to.be.equal(10);

      const existAction = await this.actionVerifierContract
        .connect(this.seekerSigner)
        .checkAction('Action');
      expect(existAction).to.be.equal(true);
    });

    it('Check for an existing action for false', async function () {
      const existAction = await this.actionVerifierContract
        .connect(this.seekerSigner)
        .checkAction('Test');
      expect(existAction).to.be.equal(false);
    });

    it('Provide rewards should revert with stake level error', async function () {
      // Given
      await this.actionVerifierContract
        .connect(this.deployerSigner)
        .importAction('Project Vote', ethers.utils.parseEther('10'));
      await this.actionVerifierContract
        .connect(this.deployerSigner)
        .importAction('Create Thread', ethers.utils.parseEther('10'));
      await this.actionVerifierContract
        .connect(this.deployerSigner)
        .updateVariables(ethers.utils.parseEther('10'), 10);

      // When and Then
      await expectRevert(
        this.actionVerifierContract
          .connect(this.lender1Signer)
          .provideRewardsForActions(actions, signatures),
        'Must be at least lvl2 staker'
      );
    });

    it('Provide rewards should revert with wrong length', async function () {
      // Given
      await this.actionVerifierContract
        .connect(this.deployerSigner)
        .importAction('Project Vote', ethers.utils.parseEther('10'));
      await this.actionVerifierContract
        .connect(this.deployerSigner)
        .importAction('Create Thread', ethers.utils.parseEther('10'));
      await this.actionVerifierContract
        .connect(this.deployerSigner)
        .updateVariables(ethers.utils.parseEther('10'), 10);

      const signatures = [
        '0x951663526a6d560d2a96eb59a186c154bc5366ceae61689736199047e936cff3308e6528c95cfba26b55721c6ccd95e7df59d955a3236b2ecb25e1fbbda012c31c',
        '0xde3ff46a7d2e34a664324563ad97be5bb2a75b8d417d6744963469d9d8e58439019856215da25c025b7f718c45ee036cd94301fbfbd1ef4197691bd4ce1ad9351b',
        '0xa9573ad90d30822f8bdac4c8d3bad1a55639adbc49594e7d33b7fb19ac8b7294392ddae15e0fb731d626f213cf9f8770929e7648971e4f1c4eccc5fc41a20f711b',
        '0xd91ea32c92ece14087cac527de74eb4e86da9f01ca2a0b221b9d5f550de20bd11e4e0efa1caed3d85f8054baec6c11bf535999fe793428b68ec7c84b44bfea7d1c',
        '0x03c9c51fb493bfccc3779df3d7f5aadce98fb3ab738da7e763e75d769ce6efbd7c8e6701f3db7c28bb1f12123595b989097caf58e76f93a203fc24287741b9561c',
      ];

      const actions = [
        {
          account: '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955',
          actionName: 'Project Vote',
          answer: 'Yes',
          referralId: '5',
        },
      ];

      // Mint albt tokens to deployer address
      const amountToTransfer = ethers.utils.parseEther('1000000');
      await this.ALBTContract.connect(this.deployerSigner).mint(
        this.lender1,
        amountToTransfer
      );
      await this.ALBTContract.connect(this.lender1Signer).approve(
        this.stakingContract.address,
        amountToTransfer
      );

      await this.stakingContract
        .connect(this.lender1Signer)
        .stake(StakingType.STAKER_LVL_2);

      // When and Then
      await expectRevert(
        this.actionVerifierContract
          .connect(this.lender1Signer)
          .provideRewardsForActions(actions, signatures),
        'Invalid length'
      );
    });

    it('Provide rewards should revert with wrong length', async function () {
      // Given
      await this.actionVerifierContract
        .connect(this.deployerSigner)
        .importAction('Project Vote', ethers.utils.parseEther('10'));
      await this.actionVerifierContract
        .connect(this.deployerSigner)
        .importAction('Create Thread', ethers.utils.parseEther('10'));
      await this.actionVerifierContract
        .connect(this.deployerSigner)
        .updateVariables(ethers.utils.parseEther('10'), 2);

      // Mint albt tokens to deployer address
      const amountToTransfer = ethers.utils.parseEther('1000000');
      await this.ALBTContract.connect(this.deployerSigner).mint(
        this.lender1,
        amountToTransfer
      );
      await this.ALBTContract.connect(this.lender1Signer).approve(
        this.stakingContract.address,
        amountToTransfer
      );

      await this.stakingContract
        .connect(this.lender1Signer)
        .stake(StakingType.STAKER_LVL_2);

      // When and Then
      await expectRevert(
        this.actionVerifierContract
          .connect(this.lender1Signer)
          .provideRewardsForActions(actions, signatures),
        'Too many actions'
      );
    });

    it('Provide rewards should be zero if signature is wrong', async function () {
      // Given
      await this.actionVerifierContract
        .connect(this.deployerSigner)
        .importAction('Project Vote', ethers.utils.parseEther('10'));
      await this.actionVerifierContract
        .connect(this.deployerSigner)
        .importAction('Create Thread', ethers.utils.parseEther('10'));
      await this.actionVerifierContract
        .connect(this.deployerSigner)
        .updateVariables(ethers.utils.parseEther('10'), 10);

      const signatures = [
        '0x951663526a6d560d2a96eb59a186c154bc5366ceae61689736199047e936cff3308e6528c95cfba26b55721c6ccd95e7df59d955a3236b2ecb25e1fbbda012c31c',
      ];

      const actions = [
        {
          account: '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955',
          actionName: 'Project Vote',
          answer: 'Yes',
          referralId: '5',
        },
      ];

      // Mint albt tokens to deployer address
      const amountToTransfer = ethers.utils.parseEther('1000000');
      await this.ALBTContract.connect(this.deployerSigner).mint(
        this.lender1,
        amountToTransfer
      );
      await this.ALBTContract.connect(this.lender1Signer).approve(
        this.stakingContract.address,
        amountToTransfer
      );

      await this.stakingContract
        .connect(this.lender1Signer)
        .stake(StakingType.STAKER_LVL_2);

      // When
      await this.actionVerifierContract
        .connect(this.lender1Signer)
        .provideRewardsForActions(actions, signatures);

      // Then
      const balanceAfter1 = await this.rALBTContract.balanceOf(this.lender1);
      expect(balanceAfter1.toNumber()).to.be.equal(0);
    });

    it('Can provide rewards', async function () {
      // Given
      await this.actionVerifierContract.connect(this.deployerSigner).importAction("Project Vote", ethers.utils.parseEther("10"));
      await this.actionVerifierContract.connect(this.deployerSigner).importAction("Create Thread", ethers.utils.parseEther("10"));
      await this.actionVerifierContract.connect(this.deployerSigner).updateVariables(ethers.utils.parseEther("10"), 10);

      // Mint albt tokens to deployer address
      const amountToTransfer = ethers.utils.parseEther('1000000');
      await this.ALBTContract.connect(this.deployerSigner).mint(
        this.lender1,
        amountToTransfer
      );
      await this.ALBTContract.connect(this.lender1Signer).approve(
        this.stakingContract.address,
        amountToTransfer
      );

      await this.stakingContract.connect(this.lender1Signer).stake(StakingType.STAKER_LVL_2);

      // When
      await this.actionVerifierContract.connect(this.lender1Signer).provideRewardsForActions( actions , signatures);

      // Then
      const balanceAfter1 = await this.rALBTContract.balanceOf(this.lender1);
      expect(balanceAfter1.toNumber()).to.be.greaterThan(0);
    });
  });
}
