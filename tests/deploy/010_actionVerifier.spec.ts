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
    const stakingContract = await deployments.get('Staking');

    // When
    const escrowAddress = await actionVerifierContract.escrow();
    const stakingAddress = await actionVerifierContract.staking();

    // Then
    expect(escrowAddress).to.equal(escrowContract.address);
    expect(stakingAddress).to.equal(stakingContract.address);
  });

  it('should revert if parameters are wrongs', async function () {
    const {deploy} = deployments;
    const {deployer, proxyOwner} = await getNamedAccounts();
    const dummyAddress = '0x856608655f8b6932993fda56dda36db77c896269';

    await expectRevert.unspecified(
      deploy('ActionVerifierTest', {
        contract: 'ActionVerifier',
        from: deployer,
        proxy: {
          owner: proxyOwner,
          methodName: 'initialize',
          proxyContract: 'OpenZeppelinTransparentProxy',
        },
        args: [0, 10, dummyAddress, dummyAddress, 1],
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
        args: [ethers.utils.parseEther('10'), 0, dummyAddress, dummyAddress, 1],
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
        args: [
          ethers.utils.parseEther('10'),
          10,
          ethers.constants.AddressZero,
          dummyAddress,
          1,
        ],
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
        args: [
          ethers.utils.parseEther('10'),
          10,
          dummyAddress,
          ethers.constants.AddressZero,
          1,
        ],
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
        args: [
          ethers.utils.parseEther('10'),
          10,
          dummyAddress,
          dummyAddress,
          0,
        ],
      })
    );
  });
});
