// Personal
import checkPersonalLoanRequests from "./personal/checkPersonalLoanRequests";
import checkLoanApproval from "./personal/checkLoanApproval";
import checkFundLoan from "./personal/checkFundLoan";
import checkLoanRepayment from "./personal/checkLoanRepayment";
import checkPersonalFundLoanOffLimit from "./personal/checkFundLoanOffLimit";
import checkProjectFundLoanOffLimit from "./project/checkFundLoanOffLimit";

// Project
import checkProjectLoanRequests from "./project/checkProjectLoanRequests";
import checkProjectLoanApproval from "./project/checkLoanApproval";
import checkProjectFundLoan from "./project/checkLoanApproval";
import checkProjectMilestoneApplication from "./project/checkProjectMilestoneApplication";
import checkProjectMilestoneApproval from "./project/checkProjectMilestoneApproval";

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
const LoanNFT = artifacts.require("LoanNFT");
const MainNFT = artifacts.require("MainNFT");

describe("Registry Personal Loans", function() {
  before(async function() {
    const accounts = await web3.eth.getAccounts();

    this.owner = accounts[0];
    this.borrower = accounts[1];
    this.lenders = [accounts[2], accounts[3], accounts[4]];
    this.delegators = [accounts[5], accounts[6], accounts[7]];
    this.projectOwner = accounts[8];

    // Deploy contracts.
    this.albt = await ALBT.new();
    this.lendingToken = await LendingToken.new();
    this.collateralToken = await CollateralToken.new();
    this.projectToken = await ProjectToken.new();
    this.loanNft = await LoanNFT.new();
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
      this.loanNft.address
    );

    this.staking = await Staking.new(this.albt.address, [
      new BN(100),
      new BN(200)
    ]);

    this.registry = await Registry.new(
      this.escrow.address,
      this.governance.address,
      this.lendingToken.address,
      this.mainNft.address,
      this.loanNft.address,
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

    // Open dao delegating
    this.governance.openDaoDelegating(2, ONE_DAY, ONE_DAY, ONE_DAY, ONE_DAY);

    // Add roles.
    await this.loanNft.grantRole(
      web3.utils.keccak256("MINTER_ROLE"),
      this.registry.address,
      { from: this.owner }
    );
    await this.loanNft.grantRole(
      web3.utils.keccak256("PAUSER_ROLE"),
      this.registry.address,
      { from: this.owner }
    );

    // Transfer tokens.
    const amountToTransfer = new BN(toWei("1000000")).toString();

    for (let i = 0; i < this.lenders.length; i++) {
      await this.lendingToken.mint(this.lenders[i], amountToTransfer, {
        from: this.owner
      });
      await this.lendingToken.approve(this.registry.address, amountToTransfer, {
        from: this.lenders[i]
      });
    }

    await this.lendingToken.mint(this.borrower, amountToTransfer, {
      from: this.owner
    });
    await this.lendingToken.approve(this.registry.address, amountToTransfer, {
      from: this.borrower
    });
    await this.collateralToken.mint(this.borrower, amountToTransfer, {
      from: this.owner
    });
    await this.collateralToken.approve(
      this.registry.address,
      amountToTransfer,
      { from: this.borrower }
    );
    await this.projectToken.mint(this.projectOwner, amountToTransfer, {
      from: this.owner
    });
    await this.projectToken.approve(this.registry.address, amountToTransfer, {
      from: this.projectOwner
    });
  });

  describe(
    "When checking personal loan requests",
    checkPersonalLoanRequests.bind(this)
  );
  describe(
    "When checking personal loan approval requests",
    checkLoanApproval.bind(this)
  );
  describe("When checking personal loan funding", checkFundLoan.bind(this));
  describe(
    "When checking personal loan repayment",
    checkLoanRepayment.bind(this)
  );
  describe(
    "When checking personal loan funding off limit",
    checkPersonalFundLoanOffLimit.bind(this)
  );
});
