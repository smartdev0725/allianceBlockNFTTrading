import {ethers, deployments, getNamedAccounts} from 'hardhat';
import {expect} from 'chai';
const {expectRevert} = require('@openzeppelin/test-helpers');

describe('Contract FundingNFT', () => {
  beforeEach(async () => {
    await deployments.fixture();
  });

  it('should be deployed', async function () {
    // Given
    const fundingNFTContract = await ethers.getContract('FundingNFT');

    // When
    const contractUri = await fundingNFTContract.contractURI();

    // Then
    expect(contractUri).to.equal('https://allianceblock.io/');
  });

  it('should revert if parameters are wrongs', async function () {
    const {deploy} = deployments;
    const {deployer, proxyOwner} = await getNamedAccounts();

    await expectRevert.unspecified(
      deploy('FundingNFTTest', {
        contract: 'FundingNFT',
        from: deployer,
        proxy: {
          owner: proxyOwner,
          methodName: 'initialize',
          proxyContract: 'OpenZeppelinTransparentProxy',
        },
        args: ['', 'https://allianceblock.io/'],
        log: true,
      })
    );

    await expectRevert.unspecified(
      deploy('FundingNFTTest', {
        contract: 'FundingNFT',
        from: deployer,
        proxy: {
          owner: proxyOwner,
          methodName: 'initialize',
          proxyContract: 'OpenZeppelinTransparentProxy',
        },
        args: ['ipfs://', ''],
        log: true,
      })
    );
  });
});
