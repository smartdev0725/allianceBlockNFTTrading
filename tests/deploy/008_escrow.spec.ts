import {ethers, deployments, getNamedAccounts} from 'hardhat';
import {expect} from 'chai';
const {expectRevert} = require('@openzeppelin/test-helpers');

describe('Contract Escrow', () => {
  beforeEach(async () => {
    await deployments.fixture();
  });

  it('should be deployed', async function () {
    // Given
    const escrowContract = await ethers.getContract('Escrow');

    const fundingNFTProxyContract = await deployments.get('FundingNFT_Proxy');
    const lendingTokenContract = await deployments.get('LendingToken');

    // When
    const lendingToken = await escrowContract.lendingToken();
    const fundingNFT = await escrowContract.fundingNFT();
    const rALBTFactory = await ethers.getContractFactory('rALBT');
    const rALBTAddress = await escrowContract.reputationalALBT();
    const rALBTContract = await rALBTFactory.attach(rALBTAddress);

    // Then
    expect(lendingToken).to.equal(lendingTokenContract.address);
    expect(fundingNFT).to.equal(fundingNFTProxyContract.address);
    expect(
      await rALBTContract.provider.getCode(rALBTContract.address)
    ).to.not.equal('0x');
  });

  it('should revert if parameters are wrongs', async function () {
    const {deploy} = deployments;
    const {deployer, proxyOwner} = await getNamedAccounts();

    const fundingNFTProxyContract = await deployments.get('FundingNFT_Proxy');
    const lendingTokenContract = await deployments.get('LendingToken');
    const fundingNFTAddress = fundingNFTProxyContract.address;
    const lendingTokenAddress = lendingTokenContract.address;

    await expectRevert.unspecified(
      deploy('EscrowTest', {
        contract: 'Escrow',
        from: deployer,
        proxy: {
          owner: proxyOwner,
          methodName: 'initialize',
          proxyContract: 'OpenZeppelinTransparentProxy',
        },
        args: [ethers.constants.AddressZero, fundingNFTAddress],
        log: true,
      })
    );

    await expectRevert.unspecified(
      deploy('EscrowTest', {
        contract: 'Escrow',
        from: deployer,
        proxy: {
          owner: proxyOwner,
          methodName: 'initialize',
          proxyContract: 'OpenZeppelinTransparentProxy',
        },
        args: [lendingTokenAddress, ethers.constants.AddressZero],
        log: true,
      })
    );
  });
});
