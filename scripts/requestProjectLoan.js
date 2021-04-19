const Registry = artifacts.require("Registry");
const Governance = artifacts.require("Governance");
const CollateralToken = artifacts.require("CollateralToken");

const BN = require("bn.js");
const { toWei } = require("web3-utils");
const { getCurrentTimestamp } = require("../tests/helpers/time");
const { ONE_DAY } = require("../tests/helpers/constants");
const { LoanStatus } = require("../tests/helpers/registryEnums");

if (!process.env.REGISTRY_ADDRESS)
  throw new Error("REGISTRY_ADDRESS missing from .env file");
if (!process.env.COLLATERAL_TOKEN_ADDRESS)
  throw new Error("COLLATERAL_TOKEN_ADDRESS missing from .env file");
if (!process.env.GOVERNANCE_ADDRESS)
  throw new Error("GOVERNANCE_ADDRESS missing from .env file");
if (!process.env.LOAN_REQUEST_TOTAL_MILESTONES)
  throw new Error("LOAN_REQUEST_TOTAL_MILESTONES missing from .env file");
if (!process.env.LOAN_REQUEST_AMOUNT_PER_MILESTONE)
  throw new Error("LOAN_REQUEST_AMOUNT_PER_MILESTONE missing from .env file");
if (!process.env.LOAN_REQUEST_DAYS_PER_MILESTONE)
  throw new Error("LOAN_REQUEST_DAYS_PER_MILESTONE missing from .env file");
//if (!process.env.LOAN_REQUEST_IPFS_HASH) throw new Error("LOAN_REQUEST_IPFS_HASH missing from .env file");

async function main() {
  // Get contracts
  const registry = await Registry.at(process.env.REGISTRY_ADDRESS);
  const collateral = await CollateralToken.at(
    process.env.COLLATERAL_TOKEN_ADDRESS
  );
  const governance = await Governance.at(process.env.GOVERNANCE_ADDRESS);
  // Get accounts
  const accounts = await web3.eth.getAccounts();
  const borrower = accounts[1];
  const delegators = [accounts[5], accounts[6], accounts[7]];
  // Set loan params
  const loanId = new BN(await registry.totalLoans());
  const approvalRequest = new BN(await governance.totalApprovalRequests());
  const totalMilestones = new BN(process.env.LOAN_REQUEST_TOTAL_MILESTONES);
  const currentTime = await getCurrentTimestamp();
  const amountCollateralized = new BN(toWei("100000"));
  const interestPercentage = new BN(20);
  const timeDiffBetweenDeliveryAndRepayment = new BN(3600);
  const ipfsHash = process.env.LOAN_REQUEST_IPFS_HASH;
  let milestoneDurations = [];
  let amountRequestedPerMilestone = [];

  for (let i = 0; i < Number(totalMilestones); i++) {
    milestoneDurations.push(
      currentTime.add(
        new BN(parseInt(process.env.LOAN_REQUEST_DAYS_PER_MILESTONE) * ONE_DAY)
      )
    );
    amountRequestedPerMilestone.push(
      new BN(toWei(process.env.LOAN_REQUEST_AMOUNT_PER_MILESTONE))
    );
  }

  await registry.requestProjectLoan(
    amountRequestedPerMilestone,
    collateral.address,
    amountCollateralized.toString(),
    interestPercentage,
    totalMilestones,
    milestoneDurations,
    timeDiffBetweenDeliveryAndRepayment,
    ipfsHash,
    { from: borrower }
  );

  await governance.voteForRequest(approvalRequest, true, {
    from: delegators[0],
  });
  await governance.voteForRequest(approvalRequest, true, {
    from: delegators[1],
  });

  const loanStatus = await registry.loanStatus(loanId);
  if (loanStatus == LoanStatus.APPROVED) {
    console.log("Requested and approved loan with ID", loanId.toNumber());
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
