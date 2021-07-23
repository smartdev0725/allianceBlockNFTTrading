import checkEscrow from './checkEscrow';

import {deployments, ethers, getNamedAccounts} from 'hardhat';

describe('Escrow', function () {
  beforeEach(async function () {
    // Deploy fixtures
    const {deploy, fixture, get} = deployments;
    await fixture();

    // Get accounts
    const {deployer, staker1, staker2, proxyOwner} = await getNamedAccounts();

    const fundingNFTContract = await get('FundingNFT');
    const lendingTokenContract = await get('LendingToken');

    await deploy('Escrow2', {
      contract: 'Escrow',
      from: deployer,
      proxy: {
        owner: proxyOwner,
        methodName: 'initialize',
        proxyContract: 'OpenZeppelinTransparentProxy',
      },
      args: [lendingTokenContract.address, fundingNFTContract.address],
      log: true,
    });

    this.escrowContract = await ethers.getContract('Escrow2');
    this.fundingNFTContract = await ethers.getContract('FundingNFT');
    this.collateralTokenContract = await ethers.getContract('CollateralToken');
    this.lendingTokenContract = await ethers.getContract('LendingToken');

    const rALBTAddress = await this.escrowContract.reputationalALBT();
    this.rALBTContract = await ethers.getContractAt('rALBT', rALBTAddress);

    // Setup escrow
    await this.escrowContract.afterInitialize(
      deployer, // Act as investment contract
      staker1, // Act as actionVerifier contract
      staker2 // Act as staking contract
    );
  });

  describe('When checking escrow functionalities', checkEscrow.bind(this));
});
