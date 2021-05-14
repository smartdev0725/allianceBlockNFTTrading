import BN from 'bn.js';
import {expect} from 'chai';
import {LoanStatus} from '../../helpers/registryEnums';
import {ONE_DAY} from '../../helpers/constants';
import {getCurrentTimestamp} from '../../helpers/time';
import {deployments, ethers, getNamedAccounts} from 'hardhat';
import {BigNumber} from 'ethers';
import {getContracts, getSigners, initializeTransfers} from "../../helpers/utils";

describe('Check project loan approval', async () => {
  let loanId: BigNumber;
  let approvalRequest: BigNumber;
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
    const {deployerSigner, lender1Signer, lender2Signer, seekerSigner, delegator1Signer, delegator2Signer} =
      await getSigners();

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
      milestoneDurations[i] = BigNumber.from(currentTime.add(new BN((i + 1) * ONE_DAY)));
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
  });

  it('when approving a project loan', async function () {
    const signers = await ethers.getSigners();
    const delegator1Signer = signers[2];
    const {delegator1} = await getNamedAccounts();

    await governanceContract
      .connect(delegator1Signer)
      .voteForRequest(approvalRequest, true);

    let daoApprovalRequest = await governanceContract.approvalRequests(
      approvalRequest
    );
    let hasVotedForRequest = await governanceContract.hasVotedForRequestId(
      delegator1,
      approvalRequest
    );

    // Correct Dao Request.
    expect(daoApprovalRequest.loanId.toNumber()).to.be.equal(loanId.toNumber());
    expect(daoApprovalRequest.isMilestone).to.be.equal(false);
    expect(daoApprovalRequest.approvalsProvided).to.be.equal(
      new BN(1)
    );
    expect(daoApprovalRequest.isApproved).to.be.equal(false);

    // Correct voting status for delegator.
    expect(hasVotedForRequest).to.be.equal(true);

    await governanceContract
      .connect(delegator1Signer)
      .voteForRequest(approvalRequest, true);

    daoApprovalRequest = await governanceContract.approvalRequests(
      approvalRequest
    );
    hasVotedForRequest = await governanceContract.hasVotedForRequestId(
      delegator1,
      approvalRequest
    );

    const isPaused = await fundingNFTContract.transfersPaused(loanId);
    const loanStatus = await registryContract.loanStatus(loanId);

    // Correct Dao Request.
    expect(daoApprovalRequest.approvalsProvided.toNumber()).to.be.equal(
      BigNumber.from(2)
    );
    expect(daoApprovalRequest.isApproved).to.be.equal(true);

    // Correct voting status for delegator.
    expect(hasVotedForRequest).to.be.equal(true);

    // Correct Nft Behavior.
    expect(isPaused).to.be.equal(false);

    // Correct Loan Status.
    expect(loanStatus.toString()).to.be.equal(LoanStatus.APPROVED);
  });
});
