
# Reputation

**Reputation** is a key sub-system that permeates the whole P2P protocol. It is measured in ten levels: from **Junior** to **Grand Master**. Users can earn **Reputation** depending on the [Tier](Glossary.md) they picked prior to investing. By interacting with the protocol, users will earn a certain amount of [Reputation Tokens (rALBT)](RALBT.md):

* Applying for a Loan
* Staking *ALBT*
* Signing messages
* Upvoting projects
* Downvoting projects
* Sharing projects and helping them reach more people
* Broadcasting messages on-chain (paying gas fees)

## Incentives
**Reputation** is highly influential in the [Investment Ticket Lottery](Glossary.md). Users with higher reputation will have higher chances of winning the lottery they partake in.

Aditionally, when a user has **10k rALBT**, they are entitled to claim an [Investment Ticket](Glossary.md) that will automatically win them a chance at the next [Ticket Lottery](Glossary.md)

In short, **rALBT** increases your chances of earning an investment opportunity. The more you participate, the better chances you'll have.

## Protection from whales
There are two major protections implemented:
1) At launch, the `transfer()` functionalities within the [rALBT token](Glossary.md) will be locked, to protect the protocol from whales.
2) The relation between the amount of **Reputation** and the benefits within the platform are equalized by the [GEV Distribution](https://en.wikipedia.org/wiki/Generalized_extreme_value_distribution). This makes the *Reputation curve* asymptotic, discouraging hoarding **rALBT**. In other words: after certain point, earning more won't have any considerable effect.

## Reputation markets
After a grace period has passed and the *Reputation tokens* have converged to a stable system, the [DAO](DAO.md) will enable the `transfer()` of *rALBT*. This will open up the possibilities to trading **Reputation Tokens**. Because of the **GEV Distribution**