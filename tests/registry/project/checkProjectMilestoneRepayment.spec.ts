import BN from 'bn.js';
import {expect} from 'chai';
import {LoanStatus} from '../../helpers/registryEnums';
import {ONE_DAY, BASE_AMOUNT} from '../../helpers/constants';
import {getCurrentTimestamp, increaseTime} from '../../helpers/time';
import {deployments, ethers, getNamedAccounts} from 'hardhat';
import {
  getContracts,
  getSigners,
  initializeTransfers,
} from '../../helpers/utils';
import {BigNumber} from 'ethers';
const {expectRevert} = require('@openzeppelin/test-helpers');

describe('Project milestone repayment', async () => {
  let loanId: BN;
  let approvalRequest: BN;
  let registryContract: any;
  let governanceContract: any;
  let fundingNFTContract: any;
  let escrowContract: any;
  let lendingTokenContract: any;
  let projectTokenContract: any;
  let collateralTokenContract: any;

  beforeEach(async function () {
    // Deploy fixtures
    await deployments.fixture();

    // Get accounts
    const {deployer, seeker, lender1, lender2} = await getNamedAccounts();
    const {
      deployerSigner,
      lender1Signer,
      lender2Signer,
      seekerSigner,
      delegator1Signer,
      delegator2Signer,
    } = await getSigners();

    // Get contracts
    ({
      registryContract,
      governanceContract,
      fundingNFTContract,
      escrowContract,
      lendingTokenContract,
      projectTokenContract,
      collateralTokenContract,
    } = await getContracts());

    // Initialize Transfers
    await initializeTransfers(
      {
        registryContract,
        lendingTokenContract,
        projectTokenContract,
        collateralTokenContract,
      },
      {lender1, lender2, seeker, deployer},
      {deployerSigner, lender1Signer, lender2Signer, seekerSigner}
    );

    // Given
    loanId = await registryContract.totalLoans();
    approvalRequest = await governanceContract.totalApprovalRequests();

    const amountCollateralized = ethers.utils.parseEther('100000');
    const projectTokenPrice = BigNumber.from(1);
    const interestPercentage = BigNumber.from(20);
    const discountPerMillion = BigNumber.from(400000);
    const totalMilestones = BigNumber.from(1);
    const paymentTimeInterval = BigNumber.from(20 * ONE_DAY);
    const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

    const milestoneDurations = new Array<BigNumber>(totalMilestones);
    const amountRequestedPerMilestone = new Array<BigNumber>(totalMilestones);
    const currentTime = await getCurrentTimestamp();

    for (let i = 0; i < Number(totalMilestones); i++) {
      milestoneDurations[i] = BigNumber.from(
        currentTime.add(new BN((i + 1) * ONE_DAY)).toString()
      );
      amountRequestedPerMilestone[i] = ethers.utils.parseEther('10000');
    }

    await registryContract
      .connect(deployerSigner)
      .requestProjectLoan(
        amountRequestedPerMilestone,
        projectTokenContract.address,
        amountCollateralized.toString(),
        projectTokenPrice,
        interestPercentage,
        discountPerMillion,
        totalMilestones,
        milestoneDurations,
        paymentTimeInterval,
        ipfsHash
      );

    const totalAmountRequested =
      amountRequestedPerMilestone[0].mul(totalMilestones);
    const totalPartitions = totalAmountRequested.div(
      ethers.utils.parseEther(BASE_AMOUNT + '')
    );
    const bigPartition = totalPartitions.div(BigNumber.from(2));

    await governanceContract
      .connect(delegator1Signer)
      .voteForRequest(approvalRequest, true);
    await governanceContract
      .connect(delegator2Signer)
      .voteForRequest(approvalRequest, true);

    await registryContract
      .connect(lender1Signer)
      .fundLoan(loanId, bigPartition);
    await registryContract
      .connect(lender2Signer)
      .fundLoan(loanId, bigPartition);

    approvalRequest = await governanceContract.totalApprovalRequests();
    await registryContract.connect(deployerSigner).applyMilestone(loanId);

    await governanceContract
      .connect(delegator1Signer)
      .voteForRequest(approvalRequest, true);
    await governanceContract
      .connect(delegator2Signer)
      .voteForRequest(approvalRequest, true);
  });

  it('when repaying a project loan', async function () {
    const loanPayments = await registryContract.projectLoanPayments(loanId);
    const {deployerSigner} = await getSigners();

    await lendingTokenContract.approve(
      registryContract.address,
      await registryContract.connect(deployerSigner).getAmountToBeRepaid(loanId)
    );
    await registryContract.connect(deployerSigner).executePayment(loanId);
    const loanStatus = await registryContract.loanStatus(loanId);

    // Correct Status.
    expect(loanStatus.toString()).to.be.equal(LoanStatus.SETTLED);
  });

  it('should revert in case it does not have allowancee', async function () {
    const signers = await ethers.getSigners();
    const {deployerSigner} = await getSigners();

    // When && Then
    await expectRevert(
      registryContract.connect(deployerSigner).executePayment(loanId),
      'transfer amount exceeds allowance'
    );
  });

  it('should revert when repaying a project loan out of time', async function () {
    const {deployerSigner} = await getSigners();

    // When
    const loanPayments = await registryContract.projectLoanPayments(loanId);

    // Move time to 1 month, so we can trigger the exception
    await increaseTime(deployerSigner.provider, 30 * 24 * 60 * 60); // One Month

    await lendingTokenContract
      .connect(deployerSigner)
      .approve(
        registryContract.address,
        await registryContract.getAmountToBeRepaid(loanId)
      );

    // Then
    await expectRevert(
      registryContract.connect(deployerSigner).executePayment(loanId),
      'Only between awaiting for repayment timeframe'
    );
  });
});
