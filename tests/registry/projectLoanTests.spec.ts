// Project
import checkProjectFundLoanOffLimit from "./project/checkFundLoanOffLimit";
import checkProjectMilestoneRepayment from "./project/checkProjectMilestoneRepayment";
import checkProjectLoanRequests from './project/checkProjectLoanRequests';
import checkProjectLoanApproval from './project/checkLoanApproval';
import checkProjectFundLoan from './project/checkLoanApproval';
import checkProjectMilestoneApplication from './project/checkProjectMilestoneApplication';
import checkProjectMilestoneApproval from './project/checkProjectMilestoneApproval';
import checkProjectTokenRepayment from './project/checkProjectTokenRepayment';
import checkProjectInvestment from './project/checkProjectInvestment';

import {
  DAO_LOAN_APPROVAL,
  DAO_MILESTONE_APPROVAL,
  VESTING_TIME_INTERVAL,
  VESTING_BATCHES,
  BASE_AMOUNT,
  MINIMUM_INTEREST_PERCENTAGE,
  MAX_MILESTONES,
  MILESTONE_EXTENSION,
  AMOUNT_FOR_DAO_MEMBERSHIP,
  FUNDING_TIME_INTERVAL,
  DAO_UPDATE_REQUEST_DURATION,
  DAO_APPROVALS_NEEDED_FOR_REGISTRY_REQUEST,
  DAO_APPROVALS_NEEDED_FOR_GOVERNANCE_REQUEST,
  ONE_DAY
} from "../helpers/constants";

import BN from "bn.js";
import { toWei } from "web3-utils";

const Registry = artifacts.require("Registry");
const Escrow = artifacts.require("Escrow");
const Governance = artifacts.require("Governance");
const Staking = artifacts.require("Staking");
const LendingToken = artifacts.require("LendingToken");
const CollateralToken = artifacts.require("CollateralToken");
const ProjectToken = artifacts.require("ProjectToken");
const ALBT = artifacts.require("ALBT");
const FundingNFT = artifacts.require("FundingNFT");
const MainNFT = artifacts.require("MainNFT");

describe("Registry Project Loans", function () {
  before(async function () {
    const accounts = await web3.eth.getAccounts();

    this.owner = accounts[0];
    this.seeker = accounts[1];
    this.lenders = [accounts[2], accounts[3], accounts[4]];
    this.delegators = [accounts[5], accounts[6], accounts[7]];
    this.projectOwner = accounts[8];

    // Deploy contracts.
    this.albt = await ALBT.new();
    this.lendingToken = await LendingToken.new();
    this.collateralToken = await CollateralToken.new();
    this.projectToken = await ProjectToken.new();
    this.fundingNft = await FundingNFT.new();
    this.mainNft = await MainNFT.new();

    const amountStakedForDaoMembership = new BN(toWei("10000"));

    this.governance = await Governance.new(
      this.owner,
      DAO_LOAN_APPROVAL,
      DAO_MILESTONE_APPROVAL,
      DAO_UPDATE_REQUEST_DURATION,
      DAO_APPROVALS_NEEDED_FOR_REGISTRY_REQUEST,
      DAO_APPROVALS_NEEDED_FOR_GOVERNANCE_REQUEST
    );

    this.escrow = await Escrow.new(
      this.lendingToken.address,
      this.mainNft.address,
      this.fundingNft.address
    );

    this.staking = await Staking.new(
      this.albt.address,
      this.governance.address,
      [new BN(100), new BN(200)]
    );

    this.registry = await Registry.new(
      this.escrow.address,
      this.governance.address,
      this.lendingToken.address,
      this.mainNft.address,
      this.fundingNft.address,
      new BN(toWei(BASE_AMOUNT.toString())),
      MINIMUM_INTEREST_PERCENTAGE,
      MAX_MILESTONES,
      MILESTONE_EXTENSION,
      VESTING_BATCHES,
      VESTING_TIME_INTERVAL,
      FUNDING_TIME_INTERVAL
    );

    // Initialize contracts.
    await this.governance.initialize(
      this.registry.address,
      this.staking.address
    );
    await this.escrow.initialize(this.registry.address);

    // Add roles.
    await this.fundingNft.grantRole(
      web3.utils.keccak256("MINTER_ROLE"),
      this.registry.address,
      { from: this.owner }
    );
    await this.fundingNft.grantRole(
      web3.utils.keccak256("PAUSER_ROLE"),
      this.registry.address,
      { from: this.owner }
    );

    // Transfer tokens.
    const amountToTransfer = new BN(toWei("10000000")).toString();

    for (let i = 0; i < this.lenders.length; i++) {
      await this.lendingToken.mint(this.lenders[i], amountToTransfer, {
        from: this.owner
      });
      await this.lendingToken.approve(this.registry.address, amountToTransfer, {
        from: this.lenders[i]
      });
    }

    await this.lendingToken.mint(this.seeker, amountToTransfer, {
      from: this.owner
    });
    await this.lendingToken.approve(this.registry.address, amountToTransfer, {
      from: this.seeker
    });
    await this.collateralToken.mint(this.seeker, amountToTransfer, {
      from: this.owner
    });
    await this.collateralToken.approve(
      this.registry.address,
      amountToTransfer,
      { from: this.seeker }
    );
    await this.projectToken.mint(this.projectOwner, amountToTransfer, {
      from: this.owner
    });
    await this.projectToken.approve(this.registry.address, amountToTransfer, {
      from: this.projectOwner
    });
  });

  describe(
    "When checking project loan requests",
    checkProjectLoanRequests.bind(this)
  );
  describe(
    "When checking project loan approval requests",
    checkProjectLoanApproval.bind(this)
  );
  describe(
    "When checking project loan funding",
    checkProjectFundLoan.bind(this)
  );
  describe(
    "When checking project milestone application",
    checkProjectMilestoneApplication.bind(this)
  );
  describe(
    "When checking project milestone approval",
    checkProjectMilestoneApproval.bind(this)
  );
  describe(
    "When checking project repayment in project tokens",
    checkProjectTokenRepayment.bind(this)
  );
  describe(
    "When checking project loan funding off limit",
    checkProjectFundLoanOffLimit.bind(this)
  );
  describe(
    "When checking project loan repayment",
    checkProjectMilestoneRepayment.bind(this)
  );
  describe(
    "When checking project investment and direct token repayment",
    checkProjectInvestment.bind(this)
  );
});
