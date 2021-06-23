import {ethers, deployments, getNamedAccounts} from 'hardhat';
import {expect} from 'chai';
const {expectRevert} = require('@openzeppelin/test-helpers');

describe('Contract ActionVerifier', () => {
  beforeEach(async () => {
    await deployments.fixture();
  });

  it('should be deployed', async function () {
    // Given
    const actionVerifierContract = await ethers.getContract('ActionVerifier');

    const escrowContract = await deployments.get('Escrow');
    const stakerMedalNFTContract = await deployments.get('StakerMedalNFT');

    // When
    const escrowAddress = await actionVerifierContract.escrow();
    const stakerMedalNFTAddress = await actionVerifierContract.stakerMedalNft();

    // Then
    expect(escrowAddress).to.equal(escrowContract.address);
    expect(stakerMedalNFTAddress).to.equal(stakerMedalNFTContract.address);
  });

  it('should revert if parameters are wrongs', async function () {
    const {deploy} = deployments;
    const {deployer, proxyOwner} = await getNamedAccounts();
    const dummyAddress = "0x856608655f8b6932993fda56dda36db77c896269";

    const rewardsPerLevel = [
      ethers.utils.parseEther('0').toString(),
      ethers.utils.parseEther('0').toString(),
      ethers.utils.parseEther('5').toString(),
      ethers.utils.parseEther('10').toString(),
    ];

    const actionsPerDayPerLevel = ['0', '0', '5', '10'];

    const dummyRewardsPerLevel = [
      ethers.utils.parseEther('0').toString(),
      ethers.utils.parseEther('0').toString(),
      ethers.utils.parseEther('0').toString(),
      ethers.utils.parseEther('0').toString(),
    ];

    const dummyActionsPerDayPerLevel = ['0', '0', '0', '0'];

    await expectRevert.unspecified(
      deploy('ActionVerifierTest', {
        contract: 'ActionVerifier',
        from: deployer,
        proxy: {
          owner: proxyOwner,
          methodName: 'initialize',
          proxyContract: 'OpenZeppelinTransparentProxy',
        },
        args: [dummyRewardsPerLevel, actionsPerDayPerLevel, dummyAddress, dummyAddress, 1],
      })
    );

    await expectRevert.unspecified(
      deploy('ActionVerifierTest', {
        contract: 'ActionVerifier',
        from: deployer,
        proxy: {
          owner: proxyOwner,
          methodName: 'initialize',
          proxyContract: 'OpenZeppelinTransparentProxy',
        },
        args: [rewardsPerLevel, dummyActionsPerDayPerLevel, dummyAddress, dummyAddress, 1],
      })
    );

    await expectRevert.unspecified(
      deploy('ActionVerifierTest', {
        contract: 'ActionVerifier',
        from: deployer,
        proxy: {
          owner: proxyOwner,
          methodName: 'initialize',
          proxyContract: 'OpenZeppelinTransparentProxy',
        },
        args: [rewardsPerLevel, actionsPerDayPerLevel, ethers.constants.AddressZero, dummyAddress, 1],
      })
    );

    await expectRevert.unspecified(
      deploy('ActionVerifierTest', {
        contract: 'ActionVerifier',
        from: deployer,
        proxy: {
          owner: proxyOwner,
          methodName: 'initialize',
          proxyContract: 'OpenZeppelinTransparentProxy',
        },
        args: [rewardsPerLevel, actionsPerDayPerLevel, dummyAddress, ethers.constants.AddressZero, 1],
      })
    );

    await expectRevert.unspecified(
      deploy('ActionVerifierTest', {
        contract: 'ActionVerifier',
        from: deployer,
        proxy: {
          owner: proxyOwner,
          methodName: 'initialize',
          proxyContract: 'OpenZeppelinTransparentProxy',
        },
        args: [rewardsPerLevel, actionsPerDayPerLevel, dummyAddress, dummyAddress, 0],
      })
    );
  });

});
