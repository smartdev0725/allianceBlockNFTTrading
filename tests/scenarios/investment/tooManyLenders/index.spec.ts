// Investment
import tooManyLenders from './tooManyLenders';

import {
  getContracts,
  getSigners,
  initializeTransfers,
} from '../../../helpers/utils';
import {deployments, ethers, getNamedAccounts} from 'hardhat';

describe('Test scenarios', function () {
  beforeEach(async function () {
    // Deploy fixtures
    await deployments.fixture();

    // Get accounts
    const {
      deployer,
      proxyOwner,
      seeker,
      lender1,
      lender2,
      lender3,
      lender4,
      superDelegator,
    } = await getNamedAccounts();
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
      mockPersonalLoanContract,
      investmentContract,
      actionVerifierContract,
      governanceContract,
      fundingNFTContract,
      escrowContract,
      lendingTokenContract,
      investmentTokenContract,
      collateralTokenContract,
      stakingContract,
      ALBTContract,
      stakerMedalNFTContract,
    } = await getContracts();
    this.projectManagerContract = projectManagerContract;
    this.mockPersonalLoanContract = mockPersonalLoanContract;
    this.investmentContract = investmentContract;
    this.actionVerifierContract = actionVerifierContract;
    this.registryContract = {};
    this.governanceContract = governanceContract;
    this.fundingNFTContract = fundingNFTContract;
    this.escrowContract = escrowContract;
    this.lendingTokenContract = lendingTokenContract;
    this.investmentTokenContract = investmentTokenContract;
    this.collateralTokenContract = collateralTokenContract;
    this.stakingContract = stakingContract;
    this.ALBTContract = ALBTContract;
    this.stakerMedalNFTContract = stakerMedalNFTContract;
    const rALBTFactory = await ethers.getContractFactory('rALBT');
    const rALBTAddress = await this.escrowContract.reputationalALBT();
    this.rALBTContract = await rALBTFactory.attach(rALBTAddress);

    // Initialize Transfers
    await initializeTransfers(
      {
        mockPersonalLoanContract,
        investmentContract,
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

    await this.projectManagerContract.createProjectType(
      mockPersonalLoanContract.address
    );

    this.approvalRequest = await governanceContract.totalApprovalRequests();

    this.projectId = await this.projectManagerContract.totalProjects();

    this.startingEscrowInvestmentTokenBalance =
      await investmentTokenContract.balanceOf(escrowContract.address);

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

    await this.ALBTContract.connect(this.deployerSigner).mint(
      this.lender4,
      amountToTransfer
    );

    await this.ALBTContract.connect(this.lender4Signer).approve(
      this.stakingContract.address,
      amountToTransfer
    );
  });

  describe('Too many lenders', tooManyLenders.bind(this));
});
