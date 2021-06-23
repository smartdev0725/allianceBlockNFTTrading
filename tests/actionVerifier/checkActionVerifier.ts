import {expect} from 'chai';
import {ethers, getNamedAccounts, web3} from 'hardhat';
import {StakingType} from '../helpers/registryEnums';
import {getSignature} from '../helpers/utils';
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
        actionName: 'Investment Vote',
        answer: 'Yes',
        referralId: '5',
      },
      {
        account: '0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f',
        actionName: 'Investment Vote',
        answer: 'No',
        referralId: '3',
      },
      {
        account: '0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f',
        actionName: 'Create Thread',
        answer: 'Investment Analysis',
        referralId: '3',
      },
      {
        account: '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720',
        actionName: 'Create Thread',
        answer: 'Investment Analysis',
        referralId: '2',
      },
      {
        account: '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720',
        actionName: 'Investment Vote',
        answer: 'Yes',
        referralId: '2',
      },
    ];

    const addressZero = '0x0000000000000000000000000000000000000000';

    it('check initial values', async function () {
      // Given and When
      const escrowAddress = await this.actionVerifierContract.escrow();
      const stakerMedalNftAddress = await this.actionVerifierContract.stakerMedalNft();
      const rewardPerActionProvisionLvl0 =
        await this.actionVerifierContract.rewardPerActionProvisionPerLevel(0);
      const rewardPerActionProvisionLvl1 =
        await this.actionVerifierContract.rewardPerActionProvisionPerLevel(1);
      const rewardPerActionProvisionLvl2 =
        await this.actionVerifierContract.rewardPerActionProvisionPerLevel(2);
      const rewardPerActionProvisionLvl3 =
        await this.actionVerifierContract.rewardPerActionProvisionPerLevel(3);
      const maxActionsPerDayLvl0 =
        await this.actionVerifierContract.maxActionsPerDayPerLevel(0);
      const maxActionsPerDayLvl1 =
        await this.actionVerifierContract.maxActionsPerDayPerLevel(1);
      const maxActionsPerDayLvl2 =
        await this.actionVerifierContract.maxActionsPerDayPerLevel(2);
      const maxActionsPerDayLvl3 =
        await this.actionVerifierContract.maxActionsPerDayPerLevel(3);

      // Then
      expect(this.escrowContract.address).to.be.equal(escrowAddress);
      expect(this.stakerMedalNft.address).to.be.equal(stakerMedalNftAddress);
      expect(rewardPerActionProvisionLvl0.toString()).to.be.equal(ethers.utils.parseEther('0').toString());
      expect(rewardPerActionProvisionLvl1.toString()).to.be.equal(ethers.utils.parseEther('0').toString());
      expect(rewardPerActionProvisionLvl2.toString()).to.be.equal(ethers.utils.parseEther('5').toString());
      expect(rewardPerActionProvisionLvl3.toString()).to.be.equal(ethers.utils.parseEther('10').toString());
      expect(maxActionsPerDayLvl0.toNumber()).to.be.equal(0);
      expect(maxActionsPerDayLvl1.toNumber()).to.be.equal(0);
      expect(maxActionsPerDayLvl2.toNumber()).to.be.equal(5);
      expect(maxActionsPerDayLvl3.toNumber()).to.be.equal(10);
    });

    it('Should revert when update variables with another user', async function () {
      const rewardsPerLevel = [
        ethers.utils.parseEther('0').toString(),
        ethers.utils.parseEther('0').toString(),
        ethers.utils.parseEther('2').toString(),
        ethers.utils.parseEther('5').toString(),
      ];

      const actionsPerDayPerLevel = ['0', '0', '2', '5'];

      await expectRevert(
        this.actionVerifierContract
          .connect(this.seekerSigner)
          .updateVariables(rewardsPerLevel, actionsPerDayPerLevel),
        'Ownable: caller is not the owner'
      );
    });

    it('Update variables', async function () {
      // Given and When
      const rewardsPerLevel = [
        ethers.utils.parseEther('0').toString(),
        ethers.utils.parseEther('0').toString(),
        ethers.utils.parseEther('2').toString(),
        ethers.utils.parseEther('5').toString(),
      ];

      const actionsPerDayPerLevel = ['0', '0', '2', '5'];

      await this.actionVerifierContract
        .connect(this.deployerSigner)
        .updateVariables(rewardsPerLevel, actionsPerDayPerLevel);

      // Then
      const rewardPerActionProvisionLvl0 =
        await this.actionVerifierContract.rewardPerActionProvisionPerLevel(0);
      const rewardPerActionProvisionLvl1 =
        await this.actionVerifierContract.rewardPerActionProvisionPerLevel(1);
      const rewardPerActionProvisionLvl2 =
        await this.actionVerifierContract.rewardPerActionProvisionPerLevel(2);
      const rewardPerActionProvisionLvl3 =
        await this.actionVerifierContract.rewardPerActionProvisionPerLevel(3);
      const maxActionsPerDayLvl0 =
        await this.actionVerifierContract.maxActionsPerDayPerLevel(0);
      const maxActionsPerDayLvl1 =
        await this.actionVerifierContract.maxActionsPerDayPerLevel(1);
      const maxActionsPerDayLvl2 =
        await this.actionVerifierContract.maxActionsPerDayPerLevel(2);
      const maxActionsPerDayLvl3 =
        await this.actionVerifierContract.maxActionsPerDayPerLevel(3);

      expect(rewardPerActionProvisionLvl0.toString()).to.be.equal(ethers.utils.parseEther('0').toString());
      expect(rewardPerActionProvisionLvl1.toString()).to.be.equal(ethers.utils.parseEther('0').toString());
      expect(rewardPerActionProvisionLvl2.toString()).to.be.equal(ethers.utils.parseEther('2').toString());
      expect(rewardPerActionProvisionLvl3.toString()).to.be.equal(ethers.utils.parseEther('5').toString());
      expect(maxActionsPerDayLvl0.toNumber()).to.be.equal(0);
      expect(maxActionsPerDayLvl1.toNumber()).to.be.equal(0);
      expect(maxActionsPerDayLvl2.toNumber()).to.be.equal(2);
      expect(maxActionsPerDayLvl3.toNumber()).to.be.equal(5);
    });

    it('Should revert when import action with another user', async function () {
      const reputationalAlbtRewardsPerLevel = [
        ethers.utils.parseEther('0').toString(),
        ethers.utils.parseEther('0').toString(),
        ethers.utils.parseEther('2').toString(),
        ethers.utils.parseEther('5').toString(),
      ];

      await expectRevert(
        this.actionVerifierContract
          .connect(this.seekerSigner)
          .importAction(
            'Test',
            reputationalAlbtRewardsPerLevel,
            reputationalAlbtRewardsPerLevel,
            1,
            this.registryContract.address,
          ),
        'Ownable: caller is not the owner'
      );
    });

    it('Should import action', async function () {
      const reputationalAlbtRewardsPerLevel = [
        ethers.utils.parseEther('0').toString(),
        ethers.utils.parseEther('0').toString(),
        ethers.utils.parseEther('2').toString(),
        ethers.utils.parseEther('5').toString(),
      ];

      // Given and When
      await this.actionVerifierContract
        .connect(this.deployerSigner)
        .importAction(
            'Action',
            reputationalAlbtRewardsPerLevel,
            reputationalAlbtRewardsPerLevel,
            2,
            addressZero,
        );

      // Then
      const action = ethers.utils.keccak256(
        ethers.utils.solidityPack(['string'], ['Action'])
      );
      const rewardPerAction = await this.actionVerifierContract.rewardPerActionPerLevel(
        action, 2
      );
      expect(rewardPerAction.toString()).to.be.equal(ethers.utils.parseEther('2').toString());
    });

    it('Should revert when update action with another user', async function () {
      const reputationalAlbtRewardsPerLevel = [
        ethers.utils.parseEther('0').toString(),
        ethers.utils.parseEther('0').toString(),
        ethers.utils.parseEther('2').toString(),
        ethers.utils.parseEther('5').toString(),
      ];

      await expectRevert(
        this.actionVerifierContract
          .connect(this.seekerSigner)
          .updateAction(
            'Action',
            reputationalAlbtRewardsPerLevel,
            reputationalAlbtRewardsPerLevel,
            2,
            addressZero,
          ),
        'Ownable: caller is not the owner'
      );
    });

    it('Should update action', async function () {
      const reputationalAlbtRewardsPerLevel = [
        ethers.utils.parseEther('0').toString(),
        ethers.utils.parseEther('0').toString(),
        ethers.utils.parseEther('2').toString(),
        ethers.utils.parseEther('5').toString(),
      ];

      // Given and When
      await this.actionVerifierContract
        .connect(this.deployerSigner)
        .importAction(
          'Action',
          reputationalAlbtRewardsPerLevel,
          reputationalAlbtRewardsPerLevel,
          2,
          addressZero,
        );

      // Then
      const action = ethers.utils.keccak256(
        ethers.utils.solidityPack(['string'], ['Action'])
      );
      const rewardPerActionBefore =
        await this.actionVerifierContract.rewardPerActionPerLevel(action, 2);
      expect(rewardPerActionBefore.toString()).to.be.equal(ethers.utils.parseEther('2').toString());

      const newReputationalAlbtRewardsPerLevel = [
        ethers.utils.parseEther('0').toString(),
        ethers.utils.parseEther('0').toString(),
        ethers.utils.parseEther('4').toString(),
        ethers.utils.parseEther('10').toString(),
      ];

      await this.actionVerifierContract
        .connect(this.deployerSigner)
        .updateAction(
          'Action',
          newReputationalAlbtRewardsPerLevel,
          newReputationalAlbtRewardsPerLevel,
          2,
          addressZero,
        );

      const rewardPerActionAfter =
        await this.actionVerifierContract.rewardPerActionPerLevel(action, 2);
      expect(rewardPerActionAfter.toString()).to.be.equal(ethers.utils.parseEther('4').toString());
    });

    it('Update action should revert if action does not exist', async function () {
      const reputationalAlbtRewardsPerLevel = [
        ethers.utils.parseEther('0').toString(),
        ethers.utils.parseEther('0').toString(),
        ethers.utils.parseEther('2').toString(),
        ethers.utils.parseEther('5').toString(),
      ];

      await expectRevert(
        this.actionVerifierContract
          .connect(this.deployerSigner)
          .updateAction(
          'Investment Vote',
          reputationalAlbtRewardsPerLevel,
          reputationalAlbtRewardsPerLevel,
          2,
          addressZero,
        ),
        'Action should already exist'
      );
    });

    it('Check for an existing action for true', async function () {
      const reputationalAlbtRewardsPerLevel = [
        ethers.utils.parseEther('0').toString(),
        ethers.utils.parseEther('0').toString(),
        ethers.utils.parseEther('2').toString(),
        ethers.utils.parseEther('5').toString(),
      ];

      // Given and When
      await this.actionVerifierContract
        .connect(this.deployerSigner)
        .importAction(
          'Action',
          reputationalAlbtRewardsPerLevel,
          reputationalAlbtRewardsPerLevel,
          2,
          addressZero,
        );

      // Then
      const action = ethers.utils.keccak256(
        ethers.utils.solidityPack(['string'], ['Action'])
      );
      const rewardPerActionLvl2 =
        await this.actionVerifierContract.rewardPerActionPerLevel(action, 2);
      expect(rewardPerActionLvl2.toString()).to.be.equal(ethers.utils.parseEther('2').toString());

      const existAction = await this.actionVerifierContract
        .connect(this.seekerSigner)
        .checkAction('Action', 2);
      expect(existAction).to.be.equal(true);
    });

    it('Check for an existing action for false', async function () {
      const existAction = await this.actionVerifierContract
        .connect(this.seekerSigner)
        .checkAction('Test', 2);
      expect(existAction).to.be.equal(false);
    });

    it('Provide rewards should revert with stake level error', async function () {
      const reputationalAlbtRewardsPerLevel = [
        ethers.utils.parseEther('0').toString(),
        ethers.utils.parseEther('0').toString(),
        ethers.utils.parseEther('2').toString(),
        ethers.utils.parseEther('5').toString(),
      ];

      // Given
      await this.actionVerifierContract
        .connect(this.deployerSigner)
        .importAction(
          'Investment Vote',
          reputationalAlbtRewardsPerLevel,
          reputationalAlbtRewardsPerLevel,
          2,
          addressZero,
        );

      await this.actionVerifierContract
        .connect(this.deployerSigner)
        .importAction(
          'Create Thread',
          reputationalAlbtRewardsPerLevel,
          reputationalAlbtRewardsPerLevel,
          2,
          addressZero,
        );

      // When and Then
      await expectRevert(
        this.actionVerifierContract
          .connect(this.lender1Signer)
          .provideRewardsForActions(actions, signatures),
        'Staking level not enough to provide rewards for actions'
      );
    });

    it('Provide rewards should revert with wrong length', async function () {
      // Given
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
          actionName: 'Investment Vote',
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
      const rewardsPerLevel = [
        ethers.utils.parseEther('0').toString(),
        ethers.utils.parseEther('0').toString(),
        ethers.utils.parseEther('2').toString(),
        ethers.utils.parseEther('5').toString(),
      ];

      const actionsPerDayPerLevel = ['0', '0', '2', '5'];

      await this.actionVerifierContract
        .connect(this.deployerSigner)
        .updateVariables(rewardsPerLevel, actionsPerDayPerLevel);

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
      const reputationalAlbtRewardsPerLevel = [
        ethers.utils.parseEther('1').toString(),
        ethers.utils.parseEther('2').toString(),
        ethers.utils.parseEther('3').toString(),
        ethers.utils.parseEther('4').toString(),
      ];

      // Given
      await this.actionVerifierContract
        .connect(this.deployerSigner)
        .importAction(
          'Investment Vote',
          reputationalAlbtRewardsPerLevel,
          reputationalAlbtRewardsPerLevel,
          2,
          addressZero,
        );

      const signatures = [
        '0x9955af11969a2d2a7f860cb00e6a00cfa7c581f5df2dbe8ea16700b33f4b4b9b69f945012f7ea7d3febf11eb1b78e1adc2d1c14c2cf48b25000938cc1860c83e01',
      ];

      const actions = [
        {
          account: '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955',
          actionName: 'Investment Vote',
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
      // See reputationalStakingTypeAmounts on the deployed contract (deploy folder), is 5000 for stake. Must not mint or provide any other reward
      expect(balanceAfter1.toString()).to.be.equal(
        ethers.utils.parseEther('5000').toString()
      );
    });

    it('Can provide rewards', async function () {
      const actions = [
        {
          account: this.lender1,
          actionName: 'Investment Vote',
          answer: 'Yes',
          referralId: '5',
        },
      ];

      // Given
      const reputationalAlbtRewardsPerLevel = [
        ethers.utils.parseEther('1').toString(),
        ethers.utils.parseEther('2').toString(),
        ethers.utils.parseEther('3').toString(),
        ethers.utils.parseEther('4').toString(),
      ];

      // Given
      await this.actionVerifierContract
        .connect(this.deployerSigner)
        .importAction(
          'Investment Vote',
          reputationalAlbtRewardsPerLevel,
          reputationalAlbtRewardsPerLevel,
          2,
          addressZero,
        );

      let signature = await getSignature(
        'Investment Vote',
        'Yes',
        this.lender1,
        5,
        this.actionVerifierContract.address,
        web3
      );

      const signatures = [signature];

      // Mint albt tokens to deployer address
      const amountToTransfer = ethers.utils.parseEther('1000000');
      await this.ALBTContract.connect(this.deployerSigner).mint(
        this.lender2,
        amountToTransfer
      );
      await this.ALBTContract.connect(this.lender2Signer).approve(
        this.stakingContract.address,
        amountToTransfer
      );

      await this.stakingContract
        .connect(this.lender2Signer)
        .stake(StakingType.STAKER_LVL_2);

      const actionAccountBalanceBefore = await this.rALBTContract.balanceOf(this.lender1);
      const provisionAccountBalanceBefore = await this.rALBTContract.balanceOf(this.lender2);

      // When
      await this.actionVerifierContract
        .connect(this.lender2Signer)
        .provideRewardsForActions(actions, signatures);

      // Then
      const actionAccountBalanceAfter = await this.rALBTContract.balanceOf(this.lender1);
      const provisionAccountBalanceAfter = await this.rALBTContract.balanceOf(this.lender2);

      expect(actionAccountBalanceAfter.sub(actionAccountBalanceBefore).toString()
      ).to.be.equal(ethers.utils.parseEther('1'));
      expect(provisionAccountBalanceAfter.sub(provisionAccountBalanceBefore).toString()
      ).to.be.equal(ethers.utils.parseEther('5'));
    });
  });
}
