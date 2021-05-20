// Personal
import checkPersonalFundLoan from './checkPersonalFundLoan';
import checkPersonalLoanRequests from './checkPersonalLoanRequests';
import checkPersonalLoanApproval from './checkPersonalLoanApproval';
import checkPersonalLoanRepayment from './checkPersonalLoanRepayment';
import checkPersonalFundLoanOffLimit from './checkPersonalFundLoanOffLimit';

import {BigNumber} from 'ethers';
import {
  getContracts,
  getSigners,
  initializeTransfers,
} from '../../helpers/utils';
import {RepaymentBatchType} from '../../helpers/registryEnums';
import {BASE_AMOUNT, ONE_DAY} from '../../helpers/constants';
import {deployments, ethers, getNamedAccounts} from 'hardhat';

describe('Registry Personal Loans', function () {
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

    const approvalRequest = await governanceContract.totalApprovalRequests();

    this.loanId = await registryContract.totalLoans();
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

    const amountRequested = this.totalPartitions.mul(
      ethers.utils.parseEther(BASE_AMOUNT + '')
    );
    const amountCollateralized = ethers.utils.parseEther('20000');
    const totalAmountOfBatches = BigNumber.from(2);
    const interestPercentage = BigNumber.from(20);
    const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ'; // Dummy hash for testing.

    await this.registryContract
      .connect(this.seekerSigner)
      .requestPersonalLoan(
        amountRequested,
        collateralTokenContract.address,
        amountCollateralized,
        totalAmountOfBatches,
        interestPercentage,
        this.batchTimeInterval,
        ipfsHash,
        RepaymentBatchType.ONLY_INTEREST
      );

    await this.governanceContract
      .connect(this.superDelegatorSigner)
      .superVoteForRequest(approvalRequest, true);
  });

  describe(
    'When checking personal loan requests',
    checkPersonalLoanRequests.bind(this)
  );
  describe(
    'When checking personal loan approval requests',
    checkPersonalLoanApproval.bind(this)
  );
  describe(
    'When checking personal loan funding',
    checkPersonalFundLoan.bind(this)
  );
  describe(
    'When checking personal loan repayment',
    checkPersonalLoanRepayment.bind(this)
  );
  describe(
    'When checking personal loan funding off limit',
    checkPersonalFundLoanOffLimit.bind(this)
  );
});
