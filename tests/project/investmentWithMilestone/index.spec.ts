// Investment
import checkInvestmentRequest from './checkInvestmentRequest';
import checkInterestForInvestment from './checkInterestForInvestment';
import checkInitialization from './checkInitialization';

import {
  getContracts,
  getSigners,
  initializeTransfers,
} from '../../helpers/utils';
import {deployments, ethers, getNamedAccounts} from 'hardhat';

describe('Investments with milestones', function () {
  beforeEach(async function () {
    // Deploy fixtures
    await deployments.fixture();

    // Get accounts
    const {deployer, proxyOwner, seeker, lender1, lender2, lender3, lender4, superDelegator} =
      await getNamedAccounts();
    this.deployer = deployer;
    this.proxyOwner = proxyOwner;
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
      projectManagerContract,
      investmentContract,
      investmentWithMilestoneContract,
      mockPersonalLoanContract,
      governanceContract,
      fundingNFTContract,
      escrowContract,
      lendingTokenContract,
      investmentTokenContract,
      collateralTokenContract,
      stakingContract,
      ALBTContract,
    } = await getContracts();
    this.projectManagerContract = projectManagerContract;
    this.investmentContract = investmentContract;
    this.investmentWithMilestoneContract = investmentWithMilestoneContract;
    this.mockPersonalLoanContract = mockPersonalLoanContract;
    this.governanceContract = governanceContract;
    this.fundingNFTContract = fundingNFTContract;
    this.escrowContract = escrowContract;
    this.lendingTokenContract = lendingTokenContract;
    this.investmentTokenContract = investmentTokenContract;
    this.collateralTokenContract = collateralTokenContract;
    this.stakingContract = stakingContract;
    this.ALBTContract = ALBTContract;
    const rALBTFactory = await ethers.getContractFactory('rALBT');
    const rALBTAddress = await this.escrowContract.reputationalALBT();
    this.rALBTContract = await rALBTFactory.attach(rALBTAddress);

    // Initialize Transfers
    await initializeTransfers(
      {
        investmentWithMilestoneContract,
        mockPersonalLoanContract,
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

    this.approvalRequest = await governanceContract.totalApprovalRequests();

    this.projectId = await this.projectManagerContract.totalProjects();

    this.startingEscrowInvestmentTokenBalance =
      await investmentTokenContract.balanceOf(escrowContract.address);

    this.amountOfTokensToBePurchased = ethers.utils.parseEther('1000');
    this.totalAmountRequested = ethers.utils.parseEther('200');
    this.ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

    await this.investmentWithMilestoneContract
      .connect(this.seekerSigner)
      .requestInvestmentWithMilestones(
        this.investmentTokenContract.address,
        [this.amountOfTokensToBePurchased/2, this.amountOfTokensToBePurchased/2],
        [1630458579, 1630558579],
        this.lendingTokenContract.address,
        [this.totalAmountRequested/2, this.totalAmountRequested/2],
        this.ipfsHash
      );

    await this.governanceContract
      .connect(this.superDelegatorSigner)
      .superVoteForRequest(this.approvalRequest, true);

    // Transfer albt tokens to stakers.
    const amountToTransfer = ethers.utils.parseEther('1000000');
    await this.ALBTContract.connect(this.deployerSigner).mint(
      this.lender1,
      amountToTransfer
    );
    await this.ALBTContract.connect(this.lender1Signer).approve(
      this.stakingContract.address,
      amountToTransfer
    );

    await this.ALBTContract.connect(this.deployerSigner).mint(
      this.lender2,
      amountToTransfer
    );
    await this.ALBTContract.connect(this.lender2Signer).approve(
      this.stakingContract.address,
      amountToTransfer
    );

    await this.ALBTContract.connect(this.deployerSigner).mint(
      this.lender3,
      amountToTransfer
    );
    await this.ALBTContract.connect(this.lender3Signer).approve(
      this.stakingContract.address,
      amountToTransfer
    );
  });

  describe(
    'When checking investment requests',
    checkInvestmentRequest.bind(this)
  );
  describe(
    'When checking interest for investment',
    checkInterestForInvestment.bind(this)
  );
  describe('When checking initialization', checkInitialization.bind(this));
});
