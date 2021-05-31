import checkEscrow from './checkEscrow';

import {deployments, ethers, getNamedAccounts} from 'hardhat';

describe('Escrow', function () {
  before(async function () {
    // Deploy fixtures
    const {deploy, fixture, get} = deployments
    await fixture();

    // Get accounts
    const {deployer, proxyOwner} = await getNamedAccounts();

    const fundingNFTContract = await get('FundingNFT');
    const mainNFTContract = await get('MainNFT');
    const lendingTokenContract = await get('LendingToken');

    await deploy('Escrow2', {
      contract: 'Escrow',
      from: deployer,
      proxy: {
        owner: proxyOwner,
        methodName: 'initialize',
        proxyContract: 'OpenZeppelinTransparentProxy',
      },
      args: [lendingTokenContract.address, mainNFTContract.address, fundingNFTContract.address],
      log: true,
    });

    this.escrowContract = await ethers.getContract('Escrow2');
    this.fundingNFTContract = await ethers.getContract('FundingNFT');

    const actionVerifierContract = await get('ActionVerifier');
    const stakingContract = await get('Staking');

    // Setup escrow
    await this.escrowContract.afterInitialize(
      deployer,
      actionVerifierContract.address,
      stakingContract.address
    );
  });

  describe('When checking escrow functionalities', checkEscrow.bind(this));
});
