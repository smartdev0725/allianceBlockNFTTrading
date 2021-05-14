import BN from 'bn.js';
import {toWei} from 'web3-utils';
import {expect} from 'chai';
import {LoanStatus} from '../../helpers/registryEnums';
import {ONE_DAY, BASE_AMOUNT} from '../../helpers/constants';
import {getCurrentTimestamp, increaseTime} from '../../helpers/time';
import {deployments, ethers, getNamedAccounts} from 'hardhat';

const {time, expectRevert} = require('@openzeppelin/test-helpers');

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

    // Given
    loanId = new BN(await registryContract.totalLoans());
    approvalRequest = new BN(await governanceContract.totalApprovalRequests());

    const amountCollateralized = new BN(toWei('100000'));
    const projectTokenPrice = new BN('1');
    const interestPercentage = new BN(20);
    const discountPerMillion = new BN(400000);
    const totalMilestones = new BN(1);
    const paymentTimeInterval = new BN(20 * ONE_DAY);
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

    await governanceContract
      .connect(delegator1Signer)
      .voteForRequest(approvalRequest, true);
    await governanceContract
      .connect(delegator2Signer)
      .voteForRequest(approvalRequest, true);
  });

  it('when repaying a project loan', async function () {
    const loanPayments = await registryContract.projectLoanPayments(loanId);
    const signers = await ethers.getSigners();
    const deployerSigner = signers[0];

    await lendingTokenContract.approve(
      registryContract.address,
      await registryContract.connect(deployerSigner).getAmountToBeRepaid(loanId)
    );
    await registryContract.connect(deployerSigner).executePayment(loanId);
    const loanStatus = await registryContract.loanStatus(loanId);

    // Correct Status.
    expect(loanStatus).to.be.bignumber.equal(LoanStatus.SETTLED);
  });

  it('should revert in case it does not have allowancee', async function () {
    const signers = await ethers.getSigners();
    const deployerSigner = signers[0];

    // When && Then
    await expectRevert(
      registryContract.connect(deployerSigner).executePayment(loanId),
      'transfer amount exceeds allowance'
    );
  });

  it('should revert when repaying a project loan out of time', async function () {
    const signers = await ethers.getSigners();
    const deployerSigner = signers[0];

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
