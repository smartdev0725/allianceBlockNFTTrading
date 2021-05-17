import { expect } from 'chai';
import { RepaymentBatchType, LoanType, LoanStatus } from '../../helpers/registryEnums';
import { ONE_DAY } from "../../helpers/constants";
import {BigNumber} from 'ethers';
import {getContracts, getSigners, initializeTransfers} from "../../helpers/utils";
import {deployments, getNamedAccounts, ethers} from "hardhat";

describe('Personal loan approval', async () => {
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
    const {
      deployerSigner,
      lender1Signer,
      lender2Signer,
      seekerSigner,
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

    const amountRequested = ethers.utils.parseEther('10000');
    const amountCollateralized = ethers.utils.parseEther('20000');
    const totalAmountOfBatches = BigNumber.from(2);
    const interestPercentage = BigNumber.from(20);
    const batchTimeInterval = BigNumber.from(20 * ONE_DAY);
    const ipfsHash = "QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ"; // Dummy hash for testing.

    await registryContract.connect(deployerSigner).requestPersonalLoan(
      amountRequested.toString(),
      collateralTokenContract.address,
      amountCollateralized.toString(),
      totalAmountOfBatches,
      interestPercentage,
      batchTimeInterval,
      ipfsHash,
      RepaymentBatchType.ONLY_INTEREST,
    );
  });

  it('when approving a loan', async function () {
    const {deployerSigner, delegator1Signer, delegator2Signer, lender1Signer} = await getSigners();
    const {delegator1, delegator2} = await getNamedAccounts();

    await governanceContract.connect(delegator1Signer).voteForRequest(approvalRequest, true);

    let daoApprovalRequest = await governanceContract.approvalRequests(approvalRequest);
    let hasVotedForRequest = await governanceContract.hasVotedForRequestId(delegator1, approvalRequest);

    // Correct Dao Request.
    expect(daoApprovalRequest.loanId.toString()).to.be.equal(loanId.toString());
    expect(daoApprovalRequest.isMilestone).to.be.equal(false);
    expect(daoApprovalRequest.approvalsProvided.toString()).to.be.equal("1");
    expect(daoApprovalRequest.isApproved).to.be.equal(false);

    // Correct voting status for delegator.
    expect(hasVotedForRequest).to.be.equal(true);

    await governanceContract.connect(delegator2Signer).voteForRequest(approvalRequest, true);

    daoApprovalRequest = await governanceContract.approvalRequests(approvalRequest);
    hasVotedForRequest = await governanceContract.hasVotedForRequestId(delegator2, approvalRequest);

    const isPaused = await fundingNFTContract.transfersPaused(loanId);
    const loanStatus = await registryContract.loanStatus(loanId);

    // Correct Dao Request.
    expect(daoApprovalRequest.approvalsProvided.toString()).to.be.equal("2");
    expect(daoApprovalRequest.isApproved).to.be.equal(true);

    // Correct voting status for delegator.
    expect(hasVotedForRequest).to.be.equal(true);

    // Correct Nft Behavior.
    expect(isPaused).to.be.equal(false);

    // Correct Loan Status.
    expect(loanStatus.toString()).to.be.equal(LoanStatus.APPROVED);
  });
});
