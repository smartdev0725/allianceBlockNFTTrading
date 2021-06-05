import checkActionVerifier from './checkActionVerifier';

import { deployments, ethers, getNamedAccounts } from 'hardhat';
import {getContracts, getSigners} from "../helpers/utils";

describe('Action Verifier', function () {
  beforeEach(async function () {
    // Deploy fixtures
    const { deploy, fixture, get } = deployments
    await fixture();

    // Get accounts
    const {
      deployer,
      proxyOwner,
      seeker,
      lender1,
      lender2,
      staker1,
      staker2,
      rewardDistributor,
    } = await getNamedAccounts();
    this.deployer = deployer;
    this.proxyOwner = proxyOwner;
    this.seeker = seeker;
    this.lender1 = lender1;
    this.lender2 = lender2;
    this.rewardDistributor = rewardDistributor;
    this.staker1 = staker1;
    this.staker2 = staker2;

    // Get signers
    const {
      deployerSigner,
      proxyOwnerSigner,
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
    this.proxyOwnerSigner = proxyOwnerSigner;
    this.delegator1Signer = delegator1Signer;
    this.delegator2Signer = delegator2Signer;
    this.lender1Signer = lender1Signer;
    this.lender2Signer = lender2Signer;
    this.seekerSigner = seekerSigner;
    this.rewardDistributorSigner = rewardDistributorSigner;
    this.staker1Signer = staker1Signer;
    this.staker2Signer = staker2Signer;

    // Get contracts
    const { actionVerifierContract, escrowContract, rALBTContract, stakingContract, ALBTContract } = await getContracts();
    this.actionVerifierContract = actionVerifierContract;
    this.escrowContract = escrowContract;
    this.stakingContract = stakingContract;
    this.ALBTContract = ALBTContract;
    this.rALBTContract = rALBTContract;
  });

  describe.only('When checking action verifier functionalities', checkActionVerifier.bind(this));
});
