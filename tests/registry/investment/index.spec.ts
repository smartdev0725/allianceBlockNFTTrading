// Project
import checkInvestmentRequest from './checkInvestmentRequest';
import checkInterestForInvestment from './checkInterestForInvestment';

import {
  getContracts,
  getSigners,
  initializeTransfers,
} from '../../helpers/utils';
import { deployments, ethers, getNamedAccounts } from 'hardhat';

describe('Registry Investments', function () {
  beforeEach(async function () {
    // Deploy fixtures
    await deployments.fixture();

    // Get accounts
    const { deployer, seeker, lender1, lender2, lender3, superDelegator } =
      await getNamedAccounts();
    this.deployer = deployer;
    this.seeker = seeker;
    this.lender1 = lender1;
    this.lender2 = lender2;
    this.lender3 = lender3;
    this.superDelegator = superDelegator;

    // Get signers
    const {
      deployerSigner,
      delegator1Signer,
      delegator2Signer,
      lender1Signer,
      lender2Signer,
      lender3Signer,
      seekerSigner,
      superDelegatorSigner,
    } = await getSigners();
    this.deployerSigner = deployerSigner;
    this.delegator1Signer = delegator1Signer;
    this.delegator2Signer = delegator2Signer;
    this.lender1Signer = lender1Signer;
    this.lender2Signer = lender2Signer;
    this.lender3Signer = lender3Signer;
    this.seekerSigner = seekerSigner;
    this.superDelegatorSigner = superDelegatorSigner;

    // Get contracts
    const {
      registryContract,
      governanceContract,
      fundingNFTContract,
      escrowContract,
      lendingTokenContract,
      projectTokenContract,
      collateralTokenContract
    } = await getContracts();
    this.registryContract = registryContract;
    this.governanceContract = governanceContract;
    this.fundingNFTContract = fundingNFTContract;
    this.escrowContract = escrowContract;
    this.lendingTokenContract = lendingTokenContract;
    this.projectTokenContract = projectTokenContract;
    this.collateralTokenContract = collateralTokenContract;

    // Initialize Transfers
    await initializeTransfers(
      {
        registryContract,
        lendingTokenContract,
        projectTokenContract,
        collateralTokenContract,
      },
      { deployer, lender1, lender2, lender3, seeker },
      {
        deployerSigner,
        lender1Signer,
        lender2Signer,
        lender3Signer,
        seekerSigner,
      }
    );

    this.approvalRequest = await governanceContract.totalApprovalRequests();

    this.loanId = await this.registryContract.totalLoans();
    this.startingEscrowProjectTokenBalance = await projectTokenContract.balanceOf(
      escrowContract.address
    );

    this.amountOfTokensToBePurchased = ethers.utils.parseEther('100000');
    this.totalAmountRequested = ethers.utils.parseEther('30000');
    this.ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

    await this.registryContract
      .connect(this.seekerSigner)
      .requestInvestment(
        this.projectTokenContract.address,
        this.amountOfTokensToBePurchased,
        this.totalAmountRequested,
        this.ipfsHash
      );

    await this.governanceContract
      .connect(this.superDelegatorSigner)
      .superVoteForRequest(this.approvalRequest, true);
  });

  describe(
    'When checking investment requests',
    checkInvestmentRequest.bind(this)
  );
  describe(
    'When checking interest for investment',
    checkInterestForInvestment.bind(this)
  );
});
