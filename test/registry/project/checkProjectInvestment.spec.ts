import BN from 'bn.js';
import {toWei} from 'web3-utils';
import {expect} from 'chai';
import {ONE_DAY, BASE_AMOUNT} from '../../helpers/constants';
import {getCurrentTimestamp, increaseTime} from '../../helpers/time';
import {deployments, ethers, getNamedAccounts} from 'hardhat';
const {expectEvent} = require('@openzeppelin/test-helpers');

describe('Check project investment', async () => {
  let loanId: BN;
  let approvalRequest: BN;
  let bigPartition: BN;
  let totalPartitions: BN;
  let totalAmountRequested: BN;
  const totalMilestones = new BN(1); // Only 1 milestone for investments
  const interestPercentage = new BN(20);
  const amountRequestedPerMilestone = new Array<BN>(totalMilestones);
  const milestoneDurations = new Array<BN>(totalMilestones);
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

    // Signers
    const signers = await ethers.getSigners();
    const deployerSigner = signers[0];
    const delegator1Signer = signers[2];
    const delegator2Signer = signers[3];
    const lender1Signer = signers[7];
    const lender2Signer = signers[8];

    loanId = new BN(await registryContract.totalLoans());
    approvalRequest = new BN(await governanceContract.totalApprovalRequests());

    const amountCollateralized = new BN(toWei('100000'));
    const projectTokenPrice = new BN(1);
    const discountPerMillion = new BN(0); // There is no discount for investment types
    const paymentTimeInterval = new BN(20 * ONE_DAY);
    const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

    // The milestone duration should be 0 for investment type since there are really no milestones to deliver
    milestoneDurations[0] = new BN(0);
    amountRequestedPerMilestone[0] = new BN(toWei('10000'));

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

    totalAmountRequested = amountRequestedPerMilestone[0].mul(totalMilestones);
    totalPartitions = totalAmountRequested.div(
      new BN(toWei(BASE_AMOUNT.toString()))
    );
    bigPartition = totalPartitions.div(new BN(2));

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

  it('when the first milestone is already approved after funding', async function () {
    const loanPayments = await registryContract.projectLoanPayments(loanId);

    expect(loanPayments.milestonesDelivered).to.be.bignumber.equal(new BN(1));
  });

  it('when all NFT can be converted after funding', async function () {
    const {lender1} = await getNamedAccounts();
    // Signers
    const signers = await ethers.getSigners();
    const lender1Signer = signers[7];

    const convertibleAmountLender0 =
      await registryContract.getAvailableFundingNFTForConversion(
        loanId,
        lender1
      );

    expect(convertibleAmountLender0).to.be.bignumber.equal(bigPartition);

    const balanceLenderBefore = await projectTokenContract.balanceOf(lender1);
    const balanceEscrowBefore = await projectTokenContract.balanceOf(
      escrowContract.address
    );
    const balanceNFTLenderBefore =
      await registryContract.balanceOfAllFundingNFTGenerations(loanId, lender1);

    // Test getter first
    const getterProjectTokenAmount = await registryContract
      .connect(lender1Signer)
      .getAmountOfProjectTokensToReceive(loanId, convertibleAmountLender0);
    // Request to receive project tokens as repayment for all of the convertible NFT
    const tx1 = await registryContract
      .connect(lender1Signer)
      .receivePayment(loanId, convertibleAmountLender0, true);

    const balanceNFTLenderAfter =
      await registryContract.balanceOfAllFundingNFTGenerations(loanId, lender1);
    const balanceLenderAfter = await projectTokenContract.balanceOf(lender1);
    const balanceEscrowAfter = await projectTokenContract.balanceOf(
      escrowContract.address
    );
    const loanPayments = await registryContract.projectLoanPayments(loanId);
    const expectedAmountToReceive = convertibleAmountLender0.mul(
      new BN(toWei(BASE_AMOUNT.toString()))
    );
    const tokenPrice = await registryContract.getProjectTokenPrice(loanId);
    const discountedPrice = tokenPrice.sub(
      tokenPrice.mul(loanPayments.discountPerMillion).div(new BN(1000000))
    );
    const expectedProjectTokenAmount =
      expectedAmountToReceive.div(discountedPrice);
    const remainingLendingAmountToPayBack = totalAmountRequested.sub(
      expectedAmountToReceive
    );
    const amountToBeRepaid = remainingLendingAmountToPayBack.add(
      remainingLendingAmountToPayBack.mul(interestPercentage).div(new BN(100))
    );

    // Correct balances
    expect(getterProjectTokenAmount).to.be.bignumber.equal(
      expectedProjectTokenAmount
    );
    expect(
      balanceNFTLenderBefore.sub(convertibleAmountLender0)
    ).to.be.bignumber.equal(balanceNFTLenderAfter);
    expect(
      balanceLenderBefore.add(expectedProjectTokenAmount)
    ).to.be.bignumber.equal(balanceLenderAfter);
    expect(
      balanceEscrowBefore.sub(expectedProjectTokenAmount)
    ).to.be.bignumber.equal(balanceEscrowAfter);
    // TODO: check balances of token from generation 1

    // Correct partitions paid in project tokens tracked and updated amount to settle the loan
    expect(loanPayments.partitionsPaidInProjectTokens).to.be.bignumber.equal(
      convertibleAmountLender0
    );
    expect(
      await registryContract.getAmountToBeRepaid(loanId)
    ).to.be.bignumber.equal(amountToBeRepaid);

    // Correct Event.
    expectEvent(tx1.receipt, 'PaymentReceived', {
      loanId,
      amountOfTokens: convertibleAmountLender0,
      generation: new BN(0),
      onProjectTokens: true,
      user: lender1,
    });
    expectEvent(tx1.receipt, 'ProjectTokenPaymentReceived', {
      loanId,
      user: lender1,
      amountOfProjectTokens: expectedProjectTokenAmount,
      discountedPrice,
    });
  });
});
