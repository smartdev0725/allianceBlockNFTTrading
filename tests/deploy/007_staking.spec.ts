import {ethers, deployments, getNamedAccounts} from 'hardhat';
import {expect} from 'chai';
const {expectRevert} = require('@openzeppelin/test-helpers');

describe('Contract Staking', () => {
  beforeEach(async () => {
    await deployments.fixture();
  });

  it('should be deployed', async function () {
    // Given
    const albtContract = await deployments.get('ALBT');
    const stakingContract = await ethers.getContract('Staking');

    // When
    const albtAddress = await stakingContract.albt();

    // Then
    expect(albtAddress).to.equal(albtContract.address);
  });

  it('should revert if parameters are wrongs', async function () {
    const {deploy, get} = deployments;

    const {deployer, proxyOwner} = await getNamedAccounts();

    const albtContractAddress = (await get('ALBT')).address;
    const escrowContractAddress = (await get('Escrow')).address;

    const stakingTypeAmounts = [
      ethers.utils.parseEther('5000'),
      ethers.utils.parseEther('20000'),
      ethers.utils.parseEther('50000'),
    ];
    const reputationalStakingTypeAmounts = [
      ethers.utils.parseEther('1000'),
      ethers.utils.parseEther('5000'),
      ethers.utils.parseEther('13000'),
    ];

    await expectRevert.unspecified(
      deploy('StakingTest', {
        contract: 'Staking',
        from: deployer,
        proxy: {
          owner: proxyOwner,
          methodName: 'initialize',
          proxyContract: 'OpenZeppelinTransparentProxy',
        },
        args: [
          ethers.constants.AddressZero,
          escrowContractAddress,
          stakingTypeAmounts,
          reputationalStakingTypeAmounts,
        ],
        log: true,
      })
    );

    await expectRevert.unspecified(
      deploy('StakingTest', {
        contract: 'Staking',
        from: deployer,
        proxy: {
          owner: proxyOwner,
          methodName: 'initialize',
          proxyContract: 'OpenZeppelinTransparentProxy',
        },
        args: [
          albtContractAddress,
          ethers.constants.AddressZero,
          stakingTypeAmounts,
          reputationalStakingTypeAmounts,
        ],
        log: true,
      })
    );

    await expectRevert.unspecified(
      deploy('StakingTest', {
        contract: 'Staking',
        from: deployer,
        proxy: {
          owner: proxyOwner,
          methodName: 'initialize',
          proxyContract: 'OpenZeppelinTransparentProxy',
        },
        args: [
          albtContractAddress,
          escrowContractAddress,
          [],
          reputationalStakingTypeAmounts,
        ],
        log: true,
      })
    );

    await expectRevert.unspecified(
      deploy('StakingTest', {
        contract: 'Staking',
        from: deployer,
        proxy: {
          owner: proxyOwner,
          methodName: 'initialize',
          proxyContract: 'OpenZeppelinTransparentProxy',
        },
        args: [
          albtContractAddress,
          escrowContractAddress,
          stakingTypeAmounts,
          [],
        ],
        log: true,
      })
    );
  });
});
