// Investment
import happyPath from './happyPath';

import {
  getContracts,
  getSigners,
  initializeTransfers,
} from '../../helpers/utils';
import {deployments, ethers, getNamedAccounts} from 'hardhat';

describe('Happy Path', function () {
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
      actionVerifierContract,
      registryContract,
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
    this.actionVerifierContract = actionVerifierContract;
    this.registryContract = registryContract;
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

    this.approvalRequest = await governanceContract.totalApprovalRequests();

    this.investmentId = await this.registryContract.totalInvestments();
    this.startingEscrowInvestmentTokenBalance =
      await investmentTokenContract.balanceOf(escrowContract.address);

    this.amountOfTokensToBePurchased = ethers.utils.parseEther('1000');
    this.totalAmountRequested = ethers.utils.parseEther('200');
    this.ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

    await this.registryContract
      .connect(this.seekerSigner)
      .requestInvestment(
        this.investmentTokenContract.address,
        this.amountOfTokensToBePurchased,
        this.lendingTokenContract.address,
        this.totalAmountRequested,
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

    await this.ALBTContract.connect(this.deployerSigner).mint(
      this.lender4,
      amountToTransfer
    );

    await this.ALBTContract.connect(this.lender4Signer).approve(
      this.stakingContract.address,
      amountToTransfer
    );

  });

  describe(
    'Happy Path process',
    happyPath.bind(this)
  );
});
