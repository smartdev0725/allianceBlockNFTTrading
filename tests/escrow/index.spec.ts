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
    const projectManagerContract = await get('ProjectManager');

    await deploy('Escrow2', {
      contract: 'Escrow',
      from: deployer,
      proxy: {
        owner: proxyOwner,
        methodName: 'initialize',
        proxyContract: 'OpenZeppelinTransparentProxy',
      },
      args: [
        lendingTokenContract.address,
        fundingNFTContract.address,
        projectManagerContract.address,
      ],
      log: true,
    });

    this.escrowContract = await ethers.getContract('Escrow2');
    this.fundingNFTContract = await ethers.getContract('FundingNFT');
    this.collateralTokenContract = await ethers.getContract('CollateralToken');
    this.lendingTokenContract = await ethers.getContract('LendingToken');
    this.projectManagerContract = await ethers.getContract('ProjectManager');

    const rALBTAddress = await this.escrowContract.reputationalALBT();
    this.rALBTContract = await ethers.getContractAt('rALBT', rALBTAddress);

    // Setup escrow
    await this.escrowContract.afterInitialize(
      staker1, // Act as actionVerifier contract
      staker2 // Act as staking contract
    );

    //SIMULATES DEPLOYER AS A PROJECT TYPE
    await this.projectManagerContract.createProjectType(deployer);
  });

  describe('When checking escrow functionalities', checkEscrow.bind(this));
});
