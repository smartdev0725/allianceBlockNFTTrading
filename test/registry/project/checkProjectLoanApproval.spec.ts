import BN from 'bn.js';
import {toWei} from 'web3-utils';
import {expect} from 'chai';
import {LoanStatus} from '../../helpers/registryEnums';
import {ONE_DAY} from '../../helpers/constants';
import {getCurrentTimestamp} from '../../helpers/time';
import {deployments, ethers, getNamedAccounts} from 'hardhat';

describe('Check project loan approval', async () => {
  let loanId: BN;
  let approvalRequest: BN;
  let registryProxyContract: any;
  let registryContract: any;
  let governanceProxyContract: any;
  let governanceContract: any;
  let fundingNFTProxyContract: any;
  let fundingNFTContract: any;
  let escrowProxyContract: any;
  let escrowContract: any;
  let lendingTokenContract: any;
  let projectTokenContract: any;

  beforeEach(async function () {
    // Deploy fixtures
    await deployments.fixture();

    // Get accounts
    const signers = await ethers.getSigners();
    const deployerSigner = signers[0];

    // Get contracts
    registryProxyContract = await deployments.get('Registry_Proxy');
    registryContract = await ethers.getContractAt(
      'Registry',
      registryProxyContract.address
    );

    governanceProxyContract = await deployments.get('Governance_Proxy');
    governanceContract = await ethers.getContractAt(
      'Governance',
      governanceProxyContract.address
    );

    fundingNFTProxyContract = await deployments.get('FundingNFT_Proxy');
    fundingNFTContract = await ethers.getContractAt(
      'FundingNFT',
      fundingNFTProxyContract.address
    );

    escrowProxyContract = await deployments.get('Escrow_Proxy');
    escrowContract = await ethers.getContractAt(
      'Escrow',
      escrowProxyContract.address
    );

    lendingTokenContract = await ethers.getContract('LendingToken');

    projectTokenContract = await ethers.getContract('ProjectToken');

    loanId = new BN(await registryContract.totalLoans());
    approvalRequest = new BN(await governanceContract.totalApprovalRequests());

    const amountCollateralized = new BN(toWei('100000'));
    const projectTokenPrice = new BN('1');
    const interestPercentage = new BN(20);
    const discountPerMillion = new BN(400000);
    const totalMilestones = new BN(3);
    const paymentTimeInterval = new BN(3600);
    const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

    const milestoneDurations = new Array<BN>(totalMilestones);
    const amountRequestedPerMilestone = new Array<BN>(totalMilestones);
    const currentTime = await getCurrentTimestamp();

    for (let i = 0; i < Number(totalMilestones); i++) {
      milestoneDurations[i] = currentTime.add(new BN((i + 1) * ONE_DAY));
      amountRequestedPerMilestone[i] = new BN(toWei('10000'));
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
    expect(daoApprovalRequest.loanId).to.be.bignumber.equal(loanId);
    expect(daoApprovalRequest.isMilestone).to.be.equal(false);
    expect(daoApprovalRequest.approvalsProvided).to.be.bignumber.equal(
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
    expect(daoApprovalRequest.approvalsProvided).to.be.bignumber.equal(
      new BN(2)
    );
    expect(daoApprovalRequest.isApproved).to.be.equal(true);

    // Correct voting status for delegator.
    expect(hasVotedForRequest).to.be.equal(true);

    // Correct Nft Behavior.
    expect(isPaused).to.be.equal(false);

    // Correct Loan Status.
    expect(loanStatus).to.be.bignumber.equal(LoanStatus.APPROVED);
  });
});
