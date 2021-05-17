import { RepaymentBatchType } from "../../helpers/registryEnums";
import { ONE_DAY, BASE_AMOUNT } from "../../helpers/constants";
import {getContracts, getSigners, initializeTransfers} from "../../helpers/utils";
import {deployments, getNamedAccounts, ethers} from "hardhat";
const { expectRevert } = require("@openzeppelin/test-helpers");
import {BigNumber} from 'ethers';
import {increaseTime} from "../../helpers/time";

describe("Personal fund loan off limit", async () => {
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
  })

  it("when funding a personal loan off the limit should revert", async function() {
    // Given
    const {deployerSigner, delegator1Signer, delegator2Signer, lender1Signer} = await getSigners();

    const loanId = await registryContract.totalLoans();
    const approvalRequest = await this.governance.totalApprovalRequests();
    const totalPartitions = BigNumber.from(100);
    const smallPartition = BigNumber.from(25);
    const amountRequested = totalPartitions.mul(ethers.utils.parseEther(BASE_AMOUNT + ''));
    const amountCollateralized = ethers.utils.parseEther("20000");
    const totalAmountOfBatches = BigNumber.from(2);
    const interestPercentage = BigNumber.from(20);
    const batchTimeInterval = BigNumber.from(20 * ONE_DAY);
    const ipfsHash = 'QmURkM5z9TQCy4tR9NB9mGSQ8198ZBP352rwQodyU8zftQ'; // Dummy hash for testing.

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

    await governanceContract.connect(delegator1Signer).voteForRequest(approvalRequest, true);
    await governanceContract.connect(delegator2Signer).voteForRequest(approvalRequest, true);

    // When
    await increaseTime(deployerSigner.provider, 30 * 24 * 60 * 60);

    // Then
    await expectRevert(
      registryContract.connect(lender1Signer).fundLoan(loanId, smallPartition),
      "Only between funding timeframe"
    );
  });
});
