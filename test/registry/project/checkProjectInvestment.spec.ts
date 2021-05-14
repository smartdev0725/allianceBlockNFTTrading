import {expect} from 'chai';
import {ONE_DAY, BASE_AMOUNT} from '../../helpers/constants';
import {deployments, ethers, getNamedAccounts} from 'hardhat';
import {getContracts, getSigners, initializeTransfers} from "../../helpers/utils";
const {expectEvent} = require('@openzeppelin/test-helpers');
import {BigNumber} from 'ethers';

describe('Check project investment', async () => {
  let loanId: BigNumber;
  let approvalRequest: BigNumber;
  let bigPartition: BigNumber;
  let totalPartitions: BigNumber;
  let totalAmountRequested: BigNumber;
  const totalMilestones = BigNumber.from(1); // Only 1 milestone for investments
  const interestPercentage = BigNumber.from(20);
  const amountRequestedPerMilestone = new Array<BigNumber>(totalMilestones);
  const milestoneDurations = new Array<BigNumber>(totalMilestones);
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
    const discountPerMillion = BigNumber.from(0); // There is no discount for investment types
    const paymentTimeInterval = BigNumber.from(20 * ONE_DAY);
    const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ';

    // The milestone duration should be 0 for investment type since there are really no milestones to deliver
    milestoneDurations[0] = BigNumber.from(0);
    amountRequestedPerMilestone[0] = ethers.utils.parseEther('10000');

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
      BigNumber.from(BASE_AMOUNT)
    );
    bigPartition = totalPartitions.div(BigNumber.from(2));

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

    expect(loanPayments.milestonesDelivered.toNumber()).to.be.equal(1);
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

    expect(convertibleAmountLender0.toNumber()).to.be.equal(bigPartition.toNumber());

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
      ethers.utils.parseEther(BASE_AMOUNT.toString())
    );
    const tokenPrice = await registryContract.getProjectTokenPrice(loanId);
    const discountedPrice = tokenPrice.sub(
      tokenPrice.mul(loanPayments.discountPerMillion).div(BigNumber.from(1000000))
    );
    const expectedProjectTokenAmount =
      expectedAmountToReceive.div(discountedPrice);
    const remainingLendingAmountToPayBack = totalAmountRequested.sub(
      expectedAmountToReceive
    );
    const amountToBeRepaid = remainingLendingAmountToPayBack.add(
      remainingLendingAmountToPayBack.mul(interestPercentage).div(BigNumber.from(100))
    );

    // Correct balances
    expect(getterProjectTokenAmount.toNumber()).to.be.equal(
      expectedProjectTokenAmount.toNumber()
    );
    expect(
      balanceNFTLenderBefore.sub(convertibleAmountLender0).toNumber()
    ).to.be.equal(balanceNFTLenderAfter.toNumber());
    expect(
      balanceLenderBefore.add(expectedProjectTokenAmount).toNumber()
    ).to.be.equal(balanceLenderAfter.toNumber());
    expect(
      balanceEscrowBefore.sub(expectedProjectTokenAmount).toNumber()
    ).to.be.equal(balanceEscrowAfter.toNumber());
    // TODO: check balances of token from generation 1

    // Correct partitions paid in project tokens tracked and updated amount to settle the loan
    expect(loanPayments.partitionsPaidInProjectTokens.toNumber()).to.be.equal(
      convertibleAmountLender0.toNumber()
    );
    const amountToBeRepaidLoanId = await registryContract.getAmountToBeRepaid(loanId)
    expect(
      amountToBeRepaidLoanId
    ).to.be.equal(amountToBeRepaid);

    // Correct Event.
    expectEvent(tx1.receipt, 'PaymentReceived', {
      loanId,
      amountOfTokens: convertibleAmountLender0,
      generation: BigNumber.from(0),
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
