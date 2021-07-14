// Investment
import checkGovernance from './checkGovernance';

import {
  getContracts,
  getSigners,
  initializeTransfers,
} from '../helpers/utils';
import {deployments, ethers, getNamedAccounts} from 'hardhat';

describe('Governance', function () {
  beforeEach(async function () {
    // Deploy fixtures
    await deployments.fixture();

    // Get accounts
    const {deployer, seeker, lender1, lender2, lender3, lender4, superDelegator} =
      await getNamedAccounts();
    this.deployer = deployer;
    this.seeker = seeker;
    this.lender1 = lender1;
    this.lender2 = lender2;
    this.lender3 = lender3;
    this.lender4 = lender4;
    this.superDelegator = superDelegator;

    // Get signers
    const {
      deployerSigner,
      delegator1Signer,
      delegator2Signer,
      lender1Signer,
      lender2Signer,
      lender3Signer,
      lender4Signer,
      seekerSigner,
      superDelegatorSigner,
    } = await getSigners();
    this.deployerSigner = deployerSigner;
    this.delegator1Signer = delegator1Signer;
    this.delegator2Signer = delegator2Signer;
    this.lender1Signer = lender1Signer;
    this.lender2Signer = lender2Signer;
    this.lender3Signer = lender3Signer;
    this.lender4Signer = lender4Signer;
    this.seekerSigner = seekerSigner;
    this.superDelegatorSigner = superDelegatorSigner;

    // Get contracts
    const {
      registryContract,
      governanceContract,
      lendingTokenContract,
      investmentTokenContract,
      collateralTokenContract,
    } = await getContracts();
    this.governanceContract = governanceContract;
    this.investmentTokenContract = investmentTokenContract;
    this.registryContract = registryContract;
    this.lendingTokenContract = lendingTokenContract;

    // Initialize Transfers
    await initializeTransfers(
      {
        registryContract,
        lendingTokenContract,
        investmentTokenContract,
        collateralTokenContract,
      },
      {deployer, lender1, lender2, lender3, lender4, seeker},
      {
        deployerSigner,
        lender1Signer,
        lender2Signer,
        lender3Signer,
        lender4Signer,
        seekerSigner,
      }
    );
  });

  describe(
    'When checking governance',
    checkGovernance.bind(this)
  );
});
