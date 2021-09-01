import {ethers, deployments, getNamedAccounts} from 'hardhat';
import {expect} from 'chai';
import {BASE_AMOUNT} from '../helpers/constants';
const {expectRevert} = require('@openzeppelin/test-helpers');

describe('Contract InvestmentWithMilestone', () => {
  beforeEach(async () => {
    await deployments.fixture();
  });

  it('should be deployed', async function () {
    // Given
    const investmentWithMilestoneContract = await ethers.getContract('InvestmentWithMilestones');

    const fundingNFTProxyContract = await deployments.get('FundingNFT_Proxy');

    // When
    const fundingNFT = await investmentWithMilestoneContract.fundingNFT();

    // Then
    expect(fundingNFT).to.equal(fundingNFTProxyContract.address);
  });

  it('should revert if parameters are wrongs', async function () {
    const {deploy, get} = deployments;

    const {deployer, proxyOwner} = await getNamedAccounts();

    const escrowAddress = (await get('Escrow')).address;
    const governanceAddress = (await get('Governance')).address;
    const lendingTokenAddress = (await get('LendingToken')).address;
    const fundingNFTAddress = (await get('FundingNFT')).address;
    const projectManagerAddress = (await get('ProjectManager')).address;
    const amount = ethers.utils.parseEther(BASE_AMOUNT + '').toString();

    await expectRevert.unspecified(
      deploy('InvestmentTest', {
        contract: 'Investment',
        from: deployer,
        proxy: {
          owner: proxyOwner,
          methodName: 'initialize',
          proxyContract: 'OpenZeppelinTransparentProxy',
        },
        args: [
          ethers.constants.AddressZero,
          governanceAddress,
          [lendingTokenAddress],
          fundingNFTAddress,
          projectManagerAddress,
          amount,
        ],
        log: true,
      })
    );

    await expectRevert.unspecified(
      deploy('InvestmentTest', {
        contract: 'Investment',
        from: deployer,
        proxy: {
          owner: proxyOwner,
          methodName: 'initialize',
          proxyContract: 'OpenZeppelinTransparentProxy',
        },
        args: [
          escrowAddress,
          ethers.constants.AddressZero,
          [lendingTokenAddress],
          fundingNFTAddress,
          projectManagerAddress,
          amount,
        ],
        log: true,
      })
    );

    await expectRevert.unspecified(
      deploy('InvestmentTest', {
        contract: 'Investment',
        from: deployer,
        proxy: {
          owner: proxyOwner,
          methodName: 'initialize',
          proxyContract: 'OpenZeppelinTransparentProxy',
        },
        args: [
          escrowAddress,
          governanceAddress,
          [ethers.constants.AddressZero],
          fundingNFTAddress,
          projectManagerAddress,
          amount,
        ],
        log: true,
      })
    );

    await expectRevert.unspecified(
      deploy('InvestmentTest', {
        contract: 'Investment',
        from: deployer,
        proxy: {
          owner: proxyOwner,
          methodName: 'initialize',
          proxyContract: 'OpenZeppelinTransparentProxy',
        },
        args: [
          escrowAddress,
          governanceAddress,
          [lendingTokenAddress],
          ethers.constants.AddressZero,
          projectManagerAddress,
          amount,
        ],
        log: true,
      })
    );

    await expectRevert.unspecified(
      deploy('InvestmentTest', {
        contract: 'Investment',
        from: deployer,
        proxy: {
          owner: proxyOwner,
          methodName: 'initialize',
          proxyContract: 'OpenZeppelinTransparentProxy',
        },
        args: [
          escrowAddress,
          governanceAddress,
          [lendingTokenAddress],
          fundingNFTAddress,
          ethers.constants.AddressZero,
          amount,
        ],
        log: true,
      })
    );
    await expectRevert.unspecified(
      deploy('InvestmentTest', {
        contract: 'Investment',
        from: deployer,
        proxy: {
          owner: proxyOwner,
          methodName: 'initialize',
          proxyContract: 'OpenZeppelinTransparentProxy',
        },
        args: [
          escrowAddress,
          governanceAddress,
          [lendingTokenAddress],
          fundingNFTAddress,
          projectManagerAddress,
          0,
        ],
        log: true,
      })
    );
  });
});
