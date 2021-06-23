import checkStakerMedal from './checkStakerMedal';

import {deployments, ethers, getNamedAccounts} from 'hardhat';
import {getContracts, getSigners} from '../helpers/utils';

describe('Staker Medal', function () {
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
    const {stakerMedalNFTContract, stakingContract} = await getContracts();
    this.stakerMedalNFTContract = stakerMedalNFTContract;
    this.stakingContract = stakingContract;

    await this.stakerMedalNFTContract.grantRole(
      ethers.utils.solidityKeccak256(['string'], ['MINTER_ROLE']),
      seeker
    );

  });

  describe('When checking staker medal', checkStakerMedal.bind(this));
});
