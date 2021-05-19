import checkStaking from './checkStaking';

import {deployments, ethers, getNamedAccounts} from "hardhat";
import {getContracts, getSigners, initializeTransfers} from "../helpers/utils";



describe('Staking', function () {
  before(async function () {
    // Deploy fixtures
    await deployments.fixture();

    // Get accounts
    const {deployer, seeker, lender1, lender2, staker1, staker2} = await getNamedAccounts();
    this.deployer = deployer;
    this.seeker = seeker;
    this.lender1 = lender1;
    this.lender2 = lender2;
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
      stakingContract
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

    // Initialize Transfers
    await initializeTransfers({
        registryContract,
        lendingTokenContract,
        projectTokenContract,
        collateralTokenContract,
      },
      {deployer, lender1, lender2, seeker},
      {deployerSigner, lender1Signer, lender2Signer, seekerSigner}
    );

    // Transfer tokens to reward distributor.
    const amountForDistributor = ethers.utils.parseEther('100000000').toString();
    await this.ALBTContract.connect(deployerSigner).mint(this.rewardDistributor, amountForDistributor);
    await this.ALBTContract.connect(rewardDistributorSigner).approve(this.staking.address, amountForDistributor);

    // Transfer albt tokens to stakers.
    const amountForStakers = ethers.utils.parseEther('1000000').toString();

    await this.ALBTContract.connect(deployerSigner).mint(staker1, amountForStakers);
    await this.ALBTContract.connect(staker1Signer).approve(this.stakingContract.address, amountForStakers);

    await this.ALBTContract.connect(deployerSigner).mint(staker2, amountForStakers);
    await this.ALBTContract.connect(staker2Signer).approve(this.stakingContract.address, amountForStakers);

  });

  describe('When checking staking rewards', checkStaking.bind(this));
});
