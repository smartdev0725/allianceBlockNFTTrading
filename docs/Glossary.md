# Glossary

## Funder:
EXPLANATION HERE

## Borrower:
EXPLANATION HERE

## Personal Loan
EXPLANATION HERE

## Collateral
EXPLANATION HERE

## Escrow
[**Escrow Subsystem**](Escrow.md) or **Escrow**, is responsible for handling the funds in the protocol's ecosystem.

## ERC-1155 tokens
EXPLANATION HERE

## Main NFT
EXPLANATION HERE

## Funding NFT
EXPLANATION HERE

## Partition:
EXPLANATION HERE

## Milestone
EXPLANATION HERE

## Storage
[**Storage Subsystem**](Storage.md) or **Storage** is responsible for holding all the information. It stores the variables for every investment, loan and project as well as the active roles for the [Governance](DAO.md).


## Network participants:
| DAO Actors     | How to become                                                                              | Function                                                                                                                                                                                                             | Incentives                                                                                                                             |   |
|----------------|--------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------|---|
| ALBT Stakers   | Stake 5000 Every user who is willing to stake ALBT tokens                                  | - secure the network                                                                                                                                                                                                 | - receive the network fees                                                                                                             |   |
| DAO Members    | Stake 50000 ALBT Request the smart contract to receive a non-tradable DAO token 50 Members | - vote on DAO delegators                                                                                                                                                                                             | - receive the network fees - receive the fraction of generated interests                                                               |   |
| DAO Delegators | Stake 250000 ALBT 11 DAO Members with highest vote number                                  | - provide assistance in project onboarding - reviewing the business plan - Request for funding advisory - voting on project funding - voting on tranche unlocking - voting on reaching the Maturity Date decisions   | - receive the network fees - receive the fraction of generated interests  - receive the fraction of initial fee paid by the project    |   |
| DAO Substitute | Stake ALBT DAO Members with highest vote number starting from 11 place on the leaderboard  | - jumps in as a substitute for a lazy voter                                                                                                                                                                          | - receive the network fees - receive the fraction of generated interests - receive additional fees when promoted to Delegator or Juror |   |

---


### Collateral token
The collateral token is the token a borrower should deposit as a guarantee for the lenders in case the loan is not repaid on time or when other agreements are not fulfilled. Any ERC20 token can be used as collateral. In the transaction(s) for requesting a loan (function requestPersonalLoan in PersonalLoan.sol or function requestProjectLoan in ProjectLoan.sol), the borrower itself can choose the ERC20 token and the amount to use as collateral. The contract will then transfer the specified amount of the token to the escrow contract.
When the loan is rejected by the governance, the collateral token will be sent back to the borrower (function decideForLoan in Registry.sol)

TODO: Returning the collateral token back to the borrower once a loan is settled is still to be implemented in the contract. Now the loan is just given the status SETTLED (function _transferPersonalLoanPayment in PersonalLoan.sol), but no other actions are taken.

TODO: Using the collateral tokens to pay back the lenders when the borrower doesn’t comply with the agreements of the loan. Now the loan is just given the status DEFAULT (function _challengePersonalLoan in PersonalLoan.sol and function _challengeProjectLoan in ProjectLoan.sol), but no other actions are taken.

### Lending token
The lending token is the token the loans are given out in, in other words, this is the token the borrower receives from the lenders when the loan is accepted. For the moment the lending token is an ERC20 token and is set in the deployment of the contracts (constructor of Registry.sol), so all loans will be given out in the same specific token.

After a loan is accepted, lenders can fund a loan (function fundLoan in Registry.sol), this will take the amount of lending tokens they want to lend and deposit them into the escrow contract. Once a loan is fully funded, the loan will be started and the lending tokens will be sent from the escrow to the borrower.

The borrower should pay the lending token back in the established repayment times (function executePayment in Registry.sol). These payments will send the lending token from the borrower back into the escrow. A lender can then claim back his part of the loan from the escrow (function receivePayment in Registry.sol).

TODO (if desired): Make the borrower choose the token he wants to lend, lenders holding that token can then lend it. Or any token of a lender could be automatically swapped for the desired lending token through 1Inch or Uniswap.

### Loan NFT
The loan NFT is the token to represent the parts of a loan given by lenders and makes holders eligible to claim the loan payments.

This token is implemented in the LoanNFT.sol contract and is an ERC1155 token so different loans can be managed by the same contract and every loan can be split up in partitions for different lenders to hold.

The tokens are minted at the time a loan is requested (function requestPersonalLoan in PersonalLoan.sol or function requestProjectLoan in ProjectLoan.sol). This first emission of loan NFT’s will be from what is called generation 0 and gives the right to claim the first repayments. Every time a payment is claimed by a lender, the loan NFT’s of the partition he claimed will be burned and loan NFT’s of a next generation will be minted (function receivePayment in Registry.sol).

The tokens are paused until the loan is approved (function decideForLoan in Registry.sol)
When a loan is funded by a lender, loan NFT tokens are transferred from the escrow contract to the lender (function fundLoan in Registry.sol).

### Collateral NFT
TODO: This token should still be implemented and used when a loan goes into default to represent a share in the collateral token for the lenders to claim.

### Project tokens
TODO: Implement repayment of project loans with the project’s own tokens.

### ALBT.sol
TODO: Use ALBT as a staking token to take part in the governance.

### Main NFT
TODO: Use the main NFT token to represent the loan as a whole.