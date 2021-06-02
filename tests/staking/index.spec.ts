import checkStaking from './checkStaking';

import { deployments, ethers, getNamedAccounts } from 'hardhat';
import { getContracts, getSigners } from '../helpers/utils';

describe('Staking', function () {
  beforeEach(async function () {
    // Deploy fixtures
    await deployments.fixture();

    // Get accounts
    const {
      deployer,
      seeker,
      lender1,
      lender2,
      staker1,
      staker2,
      rewardDistributor,
    } = await getNamedAccounts();
    this.deployer = deployer;
    this.seeker = seeker;
    this.lender1 = lender1;
    this.lender2 = lender2;
    this.rewardDistributor = rewardDistributor;
    this.staker1 = staker1;
    this.staker2 = staker2;

    // Get signers
    const {
      deployerSigner,
      delegator1Signer,
      delegator2Signer,
      lender1Signer,
      lender2Signer,
      seekerSigner,
      rewardDistributorSigner,
      staker1Signer,
      staker2Signer,
    } = await getSigners();
    this.deployerSigner = deployerSigner;
    this.delegator1Signer = delegator1Signer;
    this.delegator2Signer = delegator2Signer;
    this.lender1Signer = lender1Signer;
    this.lender2Signer = lender2Signer;
    this.seekerSigner = seekerSigner;
    this.rewardDistributorSigner = rewardDistributorSigner;
    this.staker1Signer = staker1Signer;
    this.staker2Signer = staker2Signer;

    // Get contracts
    const {
      registryContract,
      governanceContract,
      fundingNFTContract,
      escrowContract,
      lendingTokenContract,
      projectTokenContract,
      collateralTokenContract,
      ALBTContract,
      stakingContract,
    } = await getContracts();
    this.registryContract = registryContract;
    this.governanceContract = governanceContract;
    this.fundingNFTContract = fundingNFTContract;
    this.escrowContract = escrowContract;
    this.lendingTokenContract = lendingTokenContract;
    this.projectTokenContract = projectTokenContract;
    this.collateralTokenContract = collateralTokenContract;
    this.ALBTContract = ALBTContract;
    this.stakingContract = stakingContract;
    const rALBTFactory = await ethers.getContractFactory("rALBT");
    const rALBTAddress = await this.escrowContract.reputationalALBT();
    this.rALBTContract = await rALBTFactory.attach(rALBTAddress);

    // Transfer tokens to reward distributor.
    const amountForDistributor = ethers.utils.parseEther('100000000');
    await this.ALBTContract.connect(this.deployerSigner).mint(
      this.rewardDistributor,
      amountForDistributor
    );
    await this.ALBTContract.connect(this.rewardDistributorSigner).approve(
      this.stakingContract.address,
      amountForDistributor
    );

    // Transfer albt tokens to stakers.
    const amountToTransfer = ethers.utils.parseEther('1000000');
    await this.ALBTContract.connect(this.deployerSigner).mint(
      this.staker1,
      amountToTransfer
    );
    await this.ALBTContract.connect(this.staker1Signer).approve(
      this.stakingContract.address,
      amountToTransfer
    );

    await this.ALBTContract.connect(this.deployerSigner).mint(
      this.staker2,
      amountToTransfer
    );
    await this.ALBTContract.connect(this.staker2Signer).approve(
      this.stakingContract.address,
      amountToTransfer
    );

    // Mint some ALBT to the staking contract
    await this.ALBTContract.connect(this.deployerSigner).mint(
      this.stakingContract.address,
      amountToTransfer
    );
  });

  describe('When checking staking rewards', checkStaking.bind(this));
});
