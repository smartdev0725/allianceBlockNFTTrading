## `DaoSubscriptions`

Responsible for all dao subscriptions on AllianceBlock's ecosystem

Extends SuperGovernance



### `subscribeForDaoMembership()` (external)

Subscribe to become DAO Member Subscriber


Executes cronJob()
requires closed subscription

### `unsubscribeDaoMembership()` (external)

Unsubscribe from become DAO Member Subscription


Executes cronJob()
requires msg.sender not being Active DAO Member

### `voteForDaoMember(address daoSubscriberToVoteFor)` (external)

Vote from becoming DAO Member


Executes cronJob()
requires open Membership voting
requires msg.sender to be staker and DAO Membership Subscriber
requires single vote per epoch


### `claimDaoMembership()` (external)

Claim DAO Membership to become Active DAO Member


Executes cronJob()
requires msg.sender open DAO Membership and elligible DAO Member

### `subscribeForDaoDelegator()` (external)

Subscribe to become DAO Delegator Subscriptor


Executes cronJob()
requires msg.sender to be DAO Member

### `unsubscribeDaoDelegation()` (external)

Unsubscribe from DAO Delegator Subscription


Executes cronJob()
requires msg.sender not to be Active DAO Delegator

### `voteForDaoDelegator(bytes32 votingHash)` (external)

Vote from becoming a DAO Delegator Subscription


Executes cronJob()
requires open voting for DAO Delegators
requires msg.sender to be Active DAO Member and only vote once per epoch


### `approveVoteForDaoDelegator(string password, address daoDelegatorToVoteFor)` (external)

Approves vote for DAO Delegator


Executes cronJob()
requires voting approval to be open
msg.sender to send the right password and only one vote per epoch
vote to be casted for Active DAO Member


### `claimDaoDelegation()` (external)

Claim DAO Delegator


Executes cronJob()
requires Claiming DAO Delegation to be open
requires to be the next in line for becoming DAO Delegator

### `claimDaoSubstituteDelegation()` (external)

Claim DAO Substitute Delegator


Executes cronJob()
requires DAO Substitute Delegators to be requested
requires to be the next in line for becoming substitute

### `isDaoAssociated(address account, uint256 epoch) → bool, bool, uint256, uint256` (external)

check DAO Associated values


used to check pertenence of member to DAO



