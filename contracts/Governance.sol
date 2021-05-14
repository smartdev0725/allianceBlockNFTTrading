// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./interfaces/IRegistry.sol";
import "./interfaces/IStaking.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @title AllianceBlock Governance contract
 * @notice Responsible for govern AllianceBlock's ecosystem
 */
contract Governance is Initializable, OwnableUpgradeable {
    using SafeMath for uint256;

    //events
    event RequestChallenged(uint indexed requestId, address indexed user);
    event VotedForRequest(uint indexed loanId, uint indexed requestId, bool decision, address indexed user);
    event ApprovalRequested(uint indexed loanId, bool indexed isMilestone, uint milestoneNumber,  address indexed user);
    event InitGovernance(address indexed registryAddress_, address indexed stakingAddress_, address indexed user);

    mapping(address => bool) public isDaoMember;
    mapping(address => bool) public isDaoDelegator;
    mapping(address => mapping(uint256 => bool)) public hasVotedForRequestId;

    uint256 public totalApprovalRequests;
    uint256 public approvalsNeeded; // The number of approvals needed for a request to pass (TESTING: 2)

    struct ApprovalRequest {
        uint256 loanId; // The loan id for which approcal is requested.
        bool isMilestone; // true if approval reuested is connected to a milestone and false if not.
        uint256 milestoneNumber; // The milestone number if is Milestone based request.
        uint256 deadlineTimestamp; // The deadline timestamp to approve this request.
        uint256 approvalsProvided; // The number of approvals that this request has gathered.
        bool isApproved; // True if request is approved, false if not.
    }

    mapping(uint256 => ApprovalRequest) public approvalRequests;
    uint256 public loanApprovalRequestDuration;
    uint256 public milestoneApprovalRequestDuration;
    uint256 public amountStakedForDaoMembership;

    IRegistry public registry;
    IStaking public staking;

    modifier onlyRegistry() {
        require(msg.sender == address(registry), "Only Registry contract");
        _;
    }

    modifier onlyDaoDelegatorNotVoted(uint256 requestId) {
        require(isDaoDelegator[msg.sender], "Only Dao Delegator");
        require(!hasVotedForRequestId[msg.sender][requestId], "Only if not voted yet");
        _;

        hasVotedForRequestId[msg.sender][requestId] = true;
    }

    modifier onlyBeforeDeadline(uint256 requestId) {
        require(approvalRequests[requestId].deadlineTimestamp > block.timestamp,
            "Only before deadline is reached");
        _;
    }

    modifier onlyEnoughStaked() {
        require(staking.balanceOf(msg.sender) >= amountStakedForDaoMembership,
            "Only enough staked to subscribe for Dao Membership");
        _;
    }

    modifier onlyAfterDeadlineAndNotApproved(uint256 requestId) {
        require(approvalRequests[requestId].deadlineTimestamp <= block.timestamp,
            "Only after deadline is reached");
        require(!approvalRequests[requestId].isApproved, "Only if not already approved");
        _;
    }

    /**
     * @dev Initializes the contract by setting basic 
     */
    function initialize(
        address[] memory daoDelegators,
        uint256 approvalsNeeded_,
        uint256 loanApprovalRequestDuration_,
        uint256 milestoneApprovalRequestDuration_,
        uint256 amountStakedForDaoMembership_
    ) public initializer {
        __Ownable_init();
        for(uint256 i = 0; i < daoDelegators.length; i++) {
            isDaoDelegator[daoDelegators[i]] = true;
        }

        approvalsNeeded = approvalsNeeded_;
        loanApprovalRequestDuration = loanApprovalRequestDuration_;
        milestoneApprovalRequestDuration = milestoneApprovalRequestDuration_;
        amountStakedForDaoMembership = amountStakedForDaoMembership_;
    }

    function setRegistryAndStaking(
        address registryAddress_,
        address stakingAddress_
    )
    external
    onlyOwner()
    {
        require(address(registry) == address(0), "Cannot initialize second time");
        registry = IRegistry(registryAddress_);
        staking = IStaking(stakingAddress_);

        emit InitGovernance(registryAddress_, stakingAddress_, msg.sender);
    }

    function requestApproval(
    	uint256 loanId,
        bool isMilestone,
        uint256 milestoneNumber
    )
    external
    onlyRegistry()
    {
        approvalRequests[totalApprovalRequests].loanId = loanId;
        approvalRequests[totalApprovalRequests].isMilestone = isMilestone;

        if(isMilestone) {
            approvalRequests[totalApprovalRequests].milestoneNumber = milestoneNumber;
            approvalRequests[totalApprovalRequests].deadlineTimestamp = block.timestamp.add(milestoneApprovalRequestDuration);
        } else {
            approvalRequests[totalApprovalRequests].deadlineTimestamp = block.timestamp.add(loanApprovalRequestDuration);
        }

        totalApprovalRequests = totalApprovalRequests.add(1);
        emit ApprovalRequested(loanId, isMilestone, milestoneNumber, msg.sender);
    }

    function voteForRequest(
        uint256 requestId,
        bool decision
    )
    external
    onlyDaoDelegatorNotVoted(requestId)
    onlyBeforeDeadline(requestId)
    {
        if(decision)
            approvalRequests[requestId].approvalsProvided = approvalRequests[requestId].approvalsProvided.add(1);

        if(approvalRequests[requestId].approvalsProvided >= approvalsNeeded) {
            if(approvalRequests[requestId].isMilestone) {
                registry.decideForMilestone(approvalRequests[requestId].loanId, true);
            } else {
                registry.decideForLoan(approvalRequests[requestId].loanId, true);
            }

            approvalRequests[requestId].isApproved = true;
        }
        emit VotedForRequest(approvalRequests[requestId].loanId, requestId, decision, msg.sender);
    }

    function challengeRequest(
        uint256 requestId
    )
    external
    onlyAfterDeadlineAndNotApproved(requestId)
    {
        if(approvalRequests[requestId].isMilestone) {
            registry.decideForMilestone(approvalRequests[requestId].loanId, false);
        } else {
            registry.decideForLoan(approvalRequests[requestId].loanId, false);
        }
        emit RequestChallenged(requestId,msg.sender);
    }

    function subscribeForDaoMembership()
    external
    onlyEnoughStaked()
    {
        isDaoMember[msg.sender] = true;
        staking.freeze(msg.sender);
    }

    function unsubscribeForDaoMembership()
    external
    {
        require(isDaoMember[msg.sender], "Only Dao Member");
        isDaoMember[msg.sender] = false;
        staking.unfreeze(msg.sender);
    }

    /**
    * @dev Helper function for querying DAO Membership
    * @param account The address to check
    * @return (isDaoMember?, isDaoDelegator?)
    */
    function checkDaoAddress(address account) public view returns(bool, bool){
        return (isDaoMember[account],isDaoDelegator[account]);
    }

    /**
    * @dev Helper function for querying Governance variables
    * @return internal Governance uint variables
    */
    function getDaoData() public view returns(uint256,uint256,uint256,uint256,uint256){
        return (
            totalApprovalRequests,
            approvalsNeeded,
            loanApprovalRequestDuration,
            milestoneApprovalRequestDuration,
            amountStakedForDaoMembership
        );
    }
}
