// Project
import checkProjectFundLoan from './checkProjectFundLoan';
import checkProjectFundLoanOffLimit from './checkProjectFundLoanOffLimit';
import checkProjectInvestment from './checkProjectInvestment';
import checkProjectLoanApproval from './checkProjectLoanApproval';
import checkProjectLoanRequests from './checkProjectLoanRequests';
import checkProjectMilestoneApplication from './checkProjectMilestoneApplication';
import checkProjectMilestoneApproval from './checkProjectMilestoneApproval';
import checkProjectMilestoneRepayment from './checkProjectMilestoneRepayment';
import checkProjectTokenRepayment from './checkProjectTokenRepayment';

import {BigNumber} from 'ethers';
import {
  getContracts,
  getSigners,
  initializeTransfers,
} from '../../helpers/utils';
import {BASE_AMOUNT, ONE_DAY} from '../../helpers/constants';
import {deployments, ethers, getNamedAccounts} from 'hardhat';
import {getCurrentTimestamp} from '../../helpers/time';
import BN from 'bn.js';

describe('Registry Project Loans', function () {
  beforeEach(async function () {
    // Deploy fixtures
    await deployments.fixture();

    // Get accounts
    const {deployer, seeker, lender1, lender2, superDelegator} =
      await getNamedAccounts();
    this.deployer = deployer;
    this.seeker = seeker;
    this.lender1 = lender1;
    this.lender2 = lender2;
    this.superDelegator = superDelegator;

    // Get signers
    const {
      deployerSigner,
      delegator1Signer,
      delegator2Signer,
      lender1Signer,
      lender2Signer,
      seekerSigner,
      superDelegatorSigner,
    } = await getSigners();
    this.deployerSigner = deployerSigner;
    this.delegator1Signer = delegator1Signer;
    this.delegator2Signer = delegator2Signer;
    this.lender1Signer = lender1Signer;
    this.lender2Signer = lender2Signer;
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
      collateralTokenContract,
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
      {deployer, lender1, lender2, seeker},
      {deployerSigner, lender1Signer, lender2Signer, seekerSigner}
    );

    this.approvalRequest = await governanceContract.totalApprovalRequests();

    this.loanId = await this.registryContract.totalLoans();
    this.totalPartitions = BigNumber.from(100);
    this.bigPartition = BigNumber.from(50);
    this.smallPartition = BigNumber.from(25);
    this.bigPartitionAmountToPurchase = this.bigPartition.mul(
      ethers.utils.parseEther(BASE_AMOUNT + '')
    );
    this.smallPartitionAmountToPurchase = this.smallPartition.mul(
      ethers.utils.parseEther(BASE_AMOUNT + '')
    );
    this.startingEscrowLendingBalance = await lendingTokenContract.balanceOf(
      escrowContract.address
    );
    this.batchTimeInterval = BigNumber.from(20 * ONE_DAY);

    this.amountCollateralized = ethers.utils.parseEther('100000');
    this.projectTokenPrice = BigNumber.from(1);
    this.interestPercentage = BigNumber.from(20);
    this.totalMilestones = BigNumber.from(3);
    this.paymentTimeInterval = BigNumber.from(3600);
    this.discountPerMillion = BigNumber.from(400000);
    this.ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

    this.milestoneDurations = new Array<BigNumber>(this.totalMilestones);
    this.amountRequestedPerMilestone = new Array<BigNumber>(
      this.totalMilestones
    );
    this.currentTime = await getCurrentTimestamp();

    for (let i = 0; i < Number(this.totalMilestones); i++) {
      this.milestoneDurations[i] = BigNumber.from(
        this.currentTime.add(new BN((i + 1) * ONE_DAY)).toString()
      );
      this.amountRequestedPerMilestone[i] = ethers.utils.parseEther('10000');
    }

    await this.registryContract
      .connect(this.seekerSigner)
      .requestProjectLoan(
        this.amountRequestedPerMilestone,
        this.projectTokenContract.address,
        this.amountCollateralized,
        this.projectTokenPrice,
        this.interestPercentage,
        this.discountPerMillion,
        this.totalMilestones,
        this.milestoneDurations,
        this.paymentTimeInterval,
        this.ipfsHash
      );

    await this.governanceContract
      .connect(this.superDelegatorSigner)
      .superVoteForRequest(this.approvalRequest, true);
  });

  describe(
    'When checking project loan requests',
    checkProjectLoanRequests.bind(this)
  );
  describe(
    'When checking project loan approval requests',
    checkProjectLoanApproval.bind(this)
  );
  describe(
    'When checking project loan funding',
    checkProjectFundLoan.bind(this)
  );
  describe(
    'When checking project milestone application',
    checkProjectMilestoneApplication.bind(this)
  );
  describe(
    'When checking project milestone approval',
    checkProjectMilestoneApproval.bind(this)
  );
  describe(
    'When checking project repayment in project tokens',
    checkProjectTokenRepayment.bind(this)
  );
  describe(
    'When checking project loan funding off limit',
    checkProjectFundLoanOffLimit.bind(this)
  );
  describe(
    'When checking project loan repayment',
    checkProjectMilestoneRepayment.bind(this)
  );
  describe(
    'When checking project investment and direct token repayment',
    checkProjectInvestment.bind(this)
  );
});
