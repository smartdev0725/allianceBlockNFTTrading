import BN from 'bn.js';
import {expect} from 'chai';
import {LoanStatus} from '../../helpers/registryEnums';
import {ONE_DAY, BASE_AMOUNT} from '../../helpers/constants';
import {getTransactionTimestamp, getCurrentTimestamp} from '../../helpers/time';
import {ethers, deployments, getNamedAccounts} from 'hardhat';
import {
  getContracts,
  getSigners,
  initializeTransfers,
} from '../../helpers/utils';
import {BigNumber} from 'ethers';

describe('Check project fund loan', async () => {
  let loanId: BigNumber;
  let totalPartitions: BigNumber;
  let bigPartition: BigNumber;
  let smallPartition: BigNumber;
  let bigPartitionAmountToPurchase: BigNumber;
  let smallPartitionAmountToPurchase: BigNumber;
  let startingEscrowLendingBalance: BigNumber;
  let batchTimeInterval: BigNumber;
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
      delegator1Signer,
      delegator2Signer,
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

    const approvalRequest = await governanceContract.totalApprovalRequests();
    totalPartitions = BigNumber.from(100);
    bigPartition = BigNumber.from(50);
    smallPartition = BigNumber.from(25);
    bigPartitionAmountToPurchase = bigPartition.mul(
      ethers.utils.parseEther(BASE_AMOUNT + '')
    );
    smallPartitionAmountToPurchase = smallPartition.mul(
      ethers.utils.parseEther(BASE_AMOUNT + '')
    );
    startingEscrowLendingBalance = await lendingTokenContract.balanceOf(
      escrowContract.address
    );

    const amountCollateralized = ethers.utils.parseEther('100000');
    const interestPercentage = ethers.utils.parseEther('20');
    const totalMilestones = ethers.utils.parseEther('3');
    const paymentTimeInterval = ethers.utils.parseEther('3600');
    const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';
    const projectTokenPrice = ethers.utils.parseEther('1');
    const discountPerMillion = ethers.utils.parseEther('1');

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
        amountCollateralized,
        projectTokenPrice,
        interestPercentage,
        discountPerMillion,
        totalMilestones,
        milestoneDurations,
        paymentTimeInterval,
        ipfsHash
      );

    await governanceContract
      .connect(delegator1Signer)
      .voteForRequest(approvalRequest, true);
    await governanceContract
      .connect(delegator2Signer)
      .voteForRequest(approvalRequest, true);
  });

  it('when funding a project loan', async function () {
    const {deployer, lender1, lender2} = await getNamedAccounts();
    const signers = await ethers.getSigners();
    const lender1Signer = signers[7];
    const lender2Signer = signers[8];

    const initSeekerLendingBalance = await lendingTokenContract.balanceOf(
      deployer
    );
    let initEscrowLendingBalance = await lendingTokenContract.balanceOf(
      escrowContract.address
    );
    let initEscrowFundingNftBalance = await fundingNFTContract.balanceOf(
      escrowContract.address,
      loanId
    );
    let initLenderLendingBalance = await lendingTokenContract.balanceOf(
      lender1
    );
    let initLenderFundingNftBalance = await fundingNFTContract.balanceOf(
      lender2,
      loanId
    );

    let partitionsPurchased = BigNumber.from(0);

    await registryContract
      .connect(lender1Signer)
      .fundLoan(loanId, smallPartition);

    let newEscrowLendingBalance = await lendingTokenContract.balanceOf(
      escrowContract.address
    );
    let newEscrowFundingNftBalance = await fundingNFTContract.balanceOf(
      escrowContract.address,
      loanId
    );
    let newLenderLendingBalance = await lendingTokenContract.balanceOf(lender1);
    let newLenderFundingNftBalance = await fundingNFTContract.balanceOf(
      lender2,
      loanId
    );

    partitionsPurchased = partitionsPurchased.add(smallPartition);

    let loanStatus = await registryContract.loanStatus(loanId);
    let loanDetails = await registryContract.loanDetails(loanId);

    // Correct Balances.
    expect(
      newEscrowLendingBalance.sub(initEscrowLendingBalance).toNumber()
    ).to.be.equal(smallPartitionAmountToPurchase.toNumber());
    expect(
      initEscrowFundingNftBalance.sub(newEscrowFundingNftBalance).toNumber()
    ).to.be.equal(smallPartition.toNumber());
    expect(
      initLenderLendingBalance.sub(newLenderLendingBalance).toNumber()
    ).to.be.equal(smallPartitionAmountToPurchase.toNumber());
    expect(
      newLenderFundingNftBalance.sub(initLenderFundingNftBalance).toNumber
    ).to.be.equal(smallPartition.toNumber());

    // Correct Status.
    expect(loanStatus.toString()).to.be.equal(LoanStatus.FUNDING);

    // Correct Details.
    expect(loanDetails.partitionsPurchased.toNumber()).to.be.equal(
      partitionsPurchased.toNumber()
    );

    initEscrowLendingBalance = newEscrowLendingBalance;
    initEscrowFundingNftBalance = newEscrowFundingNftBalance;
    initLenderLendingBalance = await lendingTokenContract.balanceOf(lender1);
    initLenderFundingNftBalance = await fundingNFTContract.balanceOf(
      lender1,
      loanId
    );

    await registryContract
      .connect(lender1Signer)
      .fundLoan(loanId, smallPartition);

    newEscrowLendingBalance = await lendingTokenContract.balanceOf(
      escrowContract.address
    );
    newEscrowFundingNftBalance = await fundingNFTContract.balanceOf(
      escrowContract.address,
      loanId
    );
    newLenderLendingBalance = await lendingTokenContract.balanceOf(lender1);
    newLenderFundingNftBalance = await fundingNFTContract.balanceOf(
      lender1,
      loanId
    );

    partitionsPurchased = partitionsPurchased.add(smallPartition);

    loanStatus = await registryContract.loanStatus(loanId);
    loanDetails = await registryContract.loanDetails(loanId);

    // Correct Balances.
    expect(
      newEscrowLendingBalance.sub(initEscrowLendingBalance).toNumber()
    ).to.be.equal(smallPartitionAmountToPurchase.toNumber());
    expect(
      initEscrowFundingNftBalance.sub(newEscrowFundingNftBalance).toNumber()
    ).to.be.equal(smallPartition.toNumber());
    expect(
      initLenderLendingBalance.sub(newLenderLendingBalance).toNumber()
    ).to.be.equal(smallPartitionAmountToPurchase.toNumber());
    expect(
      newLenderFundingNftBalance.sub(initLenderFundingNftBalance).toNumber()
    ).to.be.equal(smallPartition.toNumber());

    // Correct Status.
    expect(loanStatus.toString()).to.be.equal(LoanStatus.FUNDING);

    // Correct Details.
    expect(loanDetails.partitionsPurchased.toNumber()).to.be.equal(
      partitionsPurchased.toNumber()
    );

    initEscrowFundingNftBalance = newEscrowFundingNftBalance;
    initLenderLendingBalance = await lendingTokenContract.balanceOf(lender2);
    initLenderFundingNftBalance = await fundingNFTContract.balanceOf(
      lender2,
      loanId
    );

    const tx = await registryContract
      .connect(lender2Signer)
      .fundLoan(loanId, bigPartition);

    const newSeekerLendingBalance = await lendingTokenContract.balanceOf(
      deployer
    );

    newEscrowLendingBalance = await lendingTokenContract.balanceOf(
      escrowContract.address
    );
    newEscrowFundingNftBalance = await fundingNFTContract.balanceOf(
      escrowContract.address,
      loanId
    );
    newLenderLendingBalance = await lendingTokenContract.balanceOf(lender2);
    newLenderFundingNftBalance = await fundingNFTContract.balanceOf(
      lender2,
      loanId
    );

    partitionsPurchased = partitionsPurchased.add(bigPartition);

    loanStatus = await registryContract.loanStatus(loanId);
    loanDetails = await registryContract.loanDetails(loanId);
    const loanPayments = await registryContract.projectLoanPayments(loanId);

    // Correct Balances.
    expect(newEscrowLendingBalance).to.be.equal(startingEscrowLendingBalance);
    expect(
      initEscrowFundingNftBalance.sub(newEscrowFundingNftBalance).toNumber()
    ).to.be.equal(bigPartition.toNumber());
    expect(
      initLenderLendingBalance.sub(newLenderLendingBalance).toNumber()
    ).to.be.equal(bigPartitionAmountToPurchase.toNumber());
    expect(
      newLenderFundingNftBalance.sub(initLenderFundingNftBalance).toNumber()
    ).to.be.equal(bigPartition.toNumber());
    expect(
      newSeekerLendingBalance.sub(initSeekerLendingBalance).toNumber()
    ).to.be.equal(loanDetails.lendingAmount.toNumber());

    // Correct Status.
    expect(loanStatus.toString()).to.be.equal(LoanStatus.STARTED);

    // Correct Details.
    expect(loanDetails.partitionsPurchased.toNumber()).to.be.equal(partitionsPurchased.toNumber());
    expect(loanDetails.totalPartitions.toNumber()).to.be.equal(partitionsPurchased.toNumber());
    expect(loanDetails.startingDate.toNumber()).to.be.equal((await getTransactionTimestamp(tx.tx)).toNumber());

    // Correct Payments.
    expect(loanPayments.batchStartingTimestamp.toNumber()).to.be.equal((await getTransactionTimestamp(tx.tx)).toNumber());
    expect(loanPayments.batchDeadlineTimestamp.toNumber()).to.be.equal(
      (await getTransactionTimestamp(tx.tx)).add(batchTimeInterval).toNumber());
  });
});
