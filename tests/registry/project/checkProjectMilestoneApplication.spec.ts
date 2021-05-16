import BN from 'bn.js';
import {expect} from 'chai';
import {LoanStatus} from '../../helpers/registryEnums';
import {
  ONE_DAY,
  BASE_AMOUNT,
  DAO_MILESTONE_APPROVAL,
} from '../../helpers/constants';
import {getCurrentTimestamp} from '../../helpers/time';
import {deployments, ethers, getNamedAccounts} from 'hardhat';
import {
  getContracts,
  getSigners,
  initializeTransfers,
} from '../../helpers/utils';
const {expectEvent} = require('@openzeppelin/test-helpers');
import {BigNumber} from 'ethers';

describe('Project milestone application', async () => {
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

    loanId = await registryContract.totalLoans();
    approvalRequest = await governanceContract.totalApprovalRequests();

    const amountCollateralized = ethers.utils.parseEther('100000');
    const projectTokenPrice = BigNumber.from(1);
    const interestPercentage = BigNumber.from(20);
    const discountPerMillion = BigNumber.from(400000);
    const totalMilestones = BigNumber.from(3);
    const paymentTimeInterval = BigNumber.from(3600);
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
  });

  it('when applying a milestone to a project loan', async function () {
    const {deployerSigner} = await getSigners();

    approvalRequest = await governanceContract.totalApprovalRequests();

    // Correct Initial Status.
    let loanStatus = await registryContract.loanStatus(loanId);
    expect(loanStatus.toString()).to.be.equal(LoanStatus.STARTED);

    // Milestone Application By Project Owner
    const tx = await registryContract
      .connect(deployerSigner)
      .applyMilestone(loanId);

    const currentTime = await getCurrentTimestamp();

    const loanPayments = await registryContract.projectLoanPayments(loanId);
    const daoApprovalRequest = await governanceContract.approvalRequests(
      approvalRequest
    );
    const isPaused = await fundingNFTContract.transfersPaused(loanId);
    loanStatus = await registryContract.loanStatus(loanId);

    // Correct Status
    expect(loanStatus.toString()).to.be.equal(
      LoanStatus.AWAITING_MILESTONE_APPROVAL
    );

    // Correct Event.
    expectEvent(tx.receipt, 'ProjectLoanMilestoneApprovalRequested', {
      loanId,
      milestoneNumber: '0',
    });

    // Correct Dao Request.
    expect(daoApprovalRequest.isMilestone).to.be.true;
    expect(daoApprovalRequest.loanId.toNumber()).to.be.equal(loanId.toNumber());
    expect(daoApprovalRequest.approvalsProvided.toNumber()).to.be.equal(0);
    expect(daoApprovalRequest.milestoneNumber.toNumber()).to.be.equal(0);
    expect(daoApprovalRequest.deadlineTimestamp.toNumber()).to.be.equal(
      currentTime.add(BigNumber.from(DAO_MILESTONE_APPROVAL))
    );
    expect(daoApprovalRequest.isApproved).to.be.equal(false);

    // Correct Payments.
    expect(loanPayments.milestonesDelivered.toNumber()).to.be.equal(0);
    expect(loanPayments.milestonesExtended.toNumber()).to.be.equal(0);

    // Correct Nft Behavior.
    expect(isPaused).to.be.equal(false);
  });
});
