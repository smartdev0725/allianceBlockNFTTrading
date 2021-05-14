import BN from 'bn.js';
import {toWei} from 'web3-utils';
import {expect} from 'chai';
import {LoanStatus} from '../../helpers/registryEnums';
import {ONE_DAY, BASE_AMOUNT} from '../../helpers/constants';
import {getCurrentTimestamp} from '../../helpers/time';
import {deployments, ethers, getNamedAccounts} from 'hardhat';

describe('Succeeds', async () => {
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
    const delegator1Signer = signers[2];
    const delegator2Signer = signers[3];
    const lender1Signer = signers[7];
    const lender2Signer = signers[8];

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

    const totalAmountRequested =
      amountRequestedPerMilestone[0].mul(totalMilestones);
    const totalPartitions = totalAmountRequested.div(
      new BN(toWei(BASE_AMOUNT.toString()))
    );
    const bigPartition = totalPartitions.div(new BN(2));

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

    approvalRequest = new BN(await governanceContract.totalApprovalRequests());
    await registryContract.connect(deployerSigner).applyMilestone(loanId);
  });

  it('when approving a milestone for a project loan', async function () {
    const {deployer} = await getNamedAccounts();
    const signers = await ethers.getSigners();
    const delegator1Signer = signers[2];
    const delegator2Signer = signers[3];

    const initSeekerLendingBalance = new BN(
      await lendingTokenContract.balanceOf(deployer)
    );
    const initEscrowLendingBalance = new BN(
      await lendingTokenContract.balanceOf(escrowContract.address)
    );

    await governanceContract
      .connect(delegator1Signer)
      .voteForRequest(approvalRequest, true);
    await governanceContract
      .connect(delegator2Signer)
      .voteForRequest(approvalRequest, true);

    const newSeekerLendingBalance = new BN(
      await lendingTokenContract.balanceOf(deployer)
    );
    const newEscrowLendingBalance = new BN(
      await lendingTokenContract.balanceOf(escrowContract.address)
    );

    const currentTime = await getCurrentTimestamp();

    const loanPayments = await registryContract.projectLoanPayments(loanId);
    const daoApprovalRequest = await governanceContract.approvalRequests(
      approvalRequest
    );
    const isPaused = await fundingNFTContract.transfersPaused(loanId);
    const loanStatus = await registryContract.loanStatus(loanId);

    const {amount} = await registryContract.getMilestonesInfo(loanId, 0);
    const {timestamp} = await registryContract.getMilestonesInfo(loanId, 1);

    // Correct Balances.
    expect(newSeekerLendingBalance).to.be.bignumber.equal(
      initSeekerLendingBalance.add(amount)
    );
    expect(newEscrowLendingBalance).to.be.bignumber.equal(
      initEscrowLendingBalance.sub(amount)
    );

    // Correct Status
    expect(loanStatus).to.be.bignumber.equal(
      LoanStatus.AWAITING_MILESTONE_APPLICATION
    );

    // Correct Dao Request.
    expect(daoApprovalRequest.loanId).to.be.bignumber.equal(loanId);
    expect(daoApprovalRequest.isMilestone).to.be.equal(true);
    expect(daoApprovalRequest.approvalsProvided).to.be.bignumber.equal(
      new BN(2)
    );
    expect(daoApprovalRequest.isApproved).to.be.equal(true);
    expect(daoApprovalRequest.milestoneNumber).to.be.bignumber.equal(new BN(0));

    // Correct Payments.
    expect(
      loanPayments.currentMilestoneStartingTimestamp
    ).to.be.bignumber.equal(new BN(currentTime));
    expect(
      loanPayments.currentMilestoneDeadlineTimestamp
    ).to.be.bignumber.equal(new BN(currentTime).add(new BN(timestamp)));
    expect(loanPayments.milestonesDelivered).to.be.bignumber.equal(new BN(1));
    expect(loanPayments.milestonesExtended).to.be.bignumber.equal(new BN(0));

    // Correct Nft Behavior.
    expect(isPaused).to.be.equal(false);
  });
});
