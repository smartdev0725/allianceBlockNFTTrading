// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./interfaces/IRegistry.sol";

/**
 * @title AllianceBlock Governance contract
 * @notice Responsible for govern AllianceBlock's ecosystem
 */
contract Governance is Ownable {
    using SafeMath for uint256;

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
        require(!approvalRequests[requestId].isApproved, "Only after deadline is reached");
        _;
    }

    /**
     * @dev Initializes the contract by setting basic 
     */
    constructor(
        address[] memory daoDelegators,
        uint256 approvalsNeeded_,
        uint256 loanApprovalRequestDuration_,
        uint256 milestoneApprovalRequestDuration_,
        uint256 amountStakedForDaoMembership_
    )
    public
    {
        for(uint256 i = 0; i < daoDelegators.length; i++) {
            isDaoDelegator[daoDelegators[i]] = true;
        }

        approvalsNeeded = approvalsNeeded_;
        loanApprovalRequestDuration = loanApprovalRequestDuration_;
        milestoneApprovalRequestDuration = milestoneApprovalRequestDuration_;
        amountStakedForDaoMembership = amountStakedForDaoMembership_;
    }

    function initialize(
        address registry_
    )
    external
    onlyOwner()
    {
        registry = IRegistry(registry_);
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

        if(approvalRequests[requestId].approvalsProvided == approvalsNeeded) {
            if(approvalRequests[requestId].isMilestone) {
                registry.decideForMilestone(approvalRequests[requestId].loanId, true);
            } else {                
                registry.decideForLoan(approvalRequests[requestId].loanId, true);
            }
        }
    }

    function challengeRequest(
        uint256 requestId,
        bool decision
    )
    external
    onlyAfterDeadlineAndNotApproved(requestId)
    {
        if(approvalRequests[requestId].isMilestone) {
            registry.decideForMilestone(approvalRequests[requestId].loanId, false);
        } else {                
            registry.decideForLoan(approvalRequests[requestId].loanId, false);
        }        
    }

    function subscribeForDaoMembership()
    external
    onlyEnoughStaked()
    {
        isDaoMember[msg.sender] = true;
        //Freeze funds.
    }

    function unsubscribeForDaoMembership()
    external
    {
        require(isDaoMember[msg.sender], "Only Dao Member");
        isDaoMember[msg.sender] = false;
        //UnFreeze funds.
    }
}
