import {ethers, deployments, getNamedAccounts} from 'hardhat';
import {expect} from 'chai';
const {expectRevert} = require('@openzeppelin/test-helpers');

describe('Contract Governance', () => {
  beforeEach(async () => {
    await deployments.fixture();
  });

  it('should be deployed', async function () {
    // Given
    const governanceContract = await ethers.getContract('Governance');

    // When
    const superGovernanceAddress = await governanceContract.superDelegator();

    // Then
    expect(ethers.utils.isAddress(superGovernanceAddress)).to.equal(true);
  });

  it('should revert if parameters are wrongs', async function () {
    const {deploy} = deployments;
    const {deployer, proxyOwner} = await getNamedAccounts();
    const dummyAddress = '0x856608655f8b6932993fda56dda36db77c896269';
    const oneDay = 24 * 60 * 60;

    await expectRevert.unspecified(
      deploy('GovernanceTest', {
        contract: 'Governance',
        from: deployer,
        proxy: {
          owner: proxyOwner,
          methodName: 'initialize',
          proxyContract: 'OpenZeppelinTransparentProxy',
        },
        args: [dummyAddress, 0, oneDay, dummyAddress],
        log: true,
      })
    );

    await expectRevert.unspecified(
      deploy('GovernanceTest', {
        contract: 'Governance',
        from: deployer,
        proxy: {
          owner: proxyOwner,
          methodName: 'initialize',
          proxyContract: 'OpenZeppelinTransparentProxy',
        },
        args: [dummyAddress, oneDay, 0, dummyAddress],
        log: true,
      })
    );

    await expectRevert.unspecified(
      deploy('GovernanceTest', {
        contract: 'Governance',
        from: deployer,
        proxy: {
          owner: proxyOwner,
          methodName: 'initialize',
          proxyContract: 'OpenZeppelinTransparentProxy',
        },
        args: [
          ethers.constants.AddressZero,
          oneDay,
          oneDay,
          ethers.constants.AddressZero,
        ],
        log: true,
      })
    );
  });
});
