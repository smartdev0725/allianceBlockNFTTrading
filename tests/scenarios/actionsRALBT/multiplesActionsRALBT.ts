/** Multiples actions RALBT
 * The objective of this test is to simulate what happens when there are many actions waiting to be sent
 * And what happens if it sends the same action two or more times
 * Were send two times the actions to verify if can receive rewards after first time
 * Adding actions and initial conditions (28-120)
 * First run (124-197)
 * Second run (199-273)
 */
import {ethers, web3} from 'hardhat';
import chai, {expect} from 'chai';
import {solidity} from 'ethereum-waffle';
import {StakingType} from '../../helpers/ProjectEnums';

import {
  batchAddNewAction,
  fundersStake,
  actionsPerLender,
} from '../../helpers/modularTests';
import {increaseTime} from '../../helpers/time';
import {getSignature} from '../../helpers/utils';
import {IAction} from '../../helpers/interfaces';
import {ONE_DAY} from '../../helpers/constants';
chai.use(solidity);

export default async function suite() {
  it('Cannot earn expected rewards for actions', async function () {
    // Stake with lender 3
    await fundersStake(this.lender3Signer, StakingType.STAKER_LVL_3);
    // Add new actions
    const actionData = {
      account: this.lender4,
      actionName: 'Wallet Connect',
      answer: 'Yes',
      referralId: 0,
    };
    const actionData1 = {
      account: this.lender4,
      actionName: 'Comment',
      answer: 'Yes',
      referralId: 1,
    };

    const addNewActionData = [
      {
        action: actionData,
        reputationalAlbtRewardsPerLevel: [
          ethers.utils.parseEther('500'),
          ethers.utils.parseEther('500'),
          ethers.utils.parseEther('500'),
          ethers.utils.parseEther('500'),
        ],
        reputationalAlbtRewardsPerLevelAfterFirstTime: [
          ethers.utils.parseEther('10'),
          ethers.utils.parseEther('10'),
          ethers.utils.parseEther('10'),
          ethers.utils.parseEther('10'),
        ],
      },
      {
        action: actionData1,
        reputationalAlbtRewardsPerLevel: [
          ethers.utils.parseEther('500'),
          ethers.utils.parseEther('500'),
          ethers.utils.parseEther('500'),
          ethers.utils.parseEther('500'),
        ],
        reputationalAlbtRewardsPerLevelAfterFirstTime: [
          ethers.utils.parseEther('10'),
          ethers.utils.parseEther('10'),
          ethers.utils.parseEther('10'),
          ethers.utils.parseEther('10'),
        ],
      },
    ];
    await batchAddNewAction(this.deployerSigner, addNewActionData);

    // Get rALBT with actions
    const allActions = [
      {...actionData, account: this.lender1},
      {...actionData, account: this.lender2},
      {...actionData, account: this.lender2},
      actionData,
      actionData,
      actionData,
      {...actionData1, account: this.lender1},
      {...actionData1, account: this.lender2},
      actionData1,
      actionData1,
      actionData1,
    ];
    // Get signatures
    const getNewSignature = async (action: IAction) => {
      const newSignature = await getSignature(
        action.actionName,
        action.answer,
        action.account,
        action.referralId,
        this.actionVerifierContract.address,
        web3
      );
      return newSignature;
    };
    const signatures = [];
    for (let index = 0; index < allActions.length; index++) {
      const action = allActions[index];
      const newSignature = await getNewSignature(action);
      signatures.push(newSignature);
    }
    // Create lendersDetails to send the actions
    let lendersDetails = await actionsPerLender(allActions);

    // Send Actions first time
    // Update info before send actions
    for (let index = 0; index < lendersDetails.length; index++) {
      const lenderInfo = lendersDetails[index];
      const lenderAddress = lenderInfo.account;

      lenderInfo.stakingLevel =
        await this.stakerMedalNFTContract.getLevelOfStaker(lenderAddress);

      lenderInfo.balanceBefore = await this.rALBTContract.balanceOf(
        lenderAddress
      );

      for (let index = 0; index < lenderInfo.actions.length; index++) {
        lenderInfo.actions[index].lastEpoch =
          await this.actionVerifierContract.lastEpochActionDonePerAccount(
            lenderAddress,
            web3.utils.keccak256(lenderInfo.actions[index].name)
          );
        lenderInfo.actions[index].rewardPerActionLevel =
          await this.actionVerifierContract.rewardPerActionPerLevel(
            web3.utils.keccak256(lenderInfo.actions[index].name),
            lenderInfo.stakingLevel
          );
        lenderInfo.actions[index].rewardPerActionPerLevelAfterFirstTime =
          await this.actionVerifierContract.rewardPerActionPerLevelAfterFirstTime(
            web3.utils.keccak256(lenderInfo.actions[index].name),
            lenderInfo.stakingLevel
          );
      }
      lendersDetails[index] = lenderInfo;
    }
    // Send Actions
    await this.actionVerifierContract
      .connect(this.lender3Signer)
      .provideRewardsForActions(allActions, signatures);

    // Update info after send actions
    for (let index = 0; index < lendersDetails.length; index++) {
      const lenderInfo = lendersDetails[index];
      const balanceRALBTAfterActions = await this.rALBTContract.balanceOf(
        lenderInfo.account
      );
      let isActionRepeated = false;
      // Calculete the rewards expected
      let rewards = lenderInfo.actions
        .map((act, actIndex) => {
          let reward = act.lastEpoch.eq(0)
            ? act.rewardPerActionLevel
            : act.rewardPerActionPerLevelAfterFirstTime;
          reward = reward.add(
            act.rewardPerActionPerLevelAfterFirstTime.mul(
              act.amountOfTimes.sub(1)
            )
          );
          if (act.amountOfTimes.gt(1)) {
            isActionRepeated = true;
          }
          return reward;
        })
        .reduce((reward1, reward2) => reward1.add(reward2));

      // Expect
      if (isActionRepeated) {
        expect(balanceRALBTAfterActions.sub(lenderInfo.balanceBefore)).to.be.lt(
          rewards
        );
      } else {
        expect(balanceRALBTAfterActions.sub(lenderInfo.balanceBefore)).to.be.eq(
          rewards
        );
      }
    }

    // Send actions a second time to check if can receive rewards after first time
    // Update info before send actions
    for (let index = 0; index < lendersDetails.length; index++) {
      const lenderInfo = lendersDetails[index];
      const lenderAddress = lenderInfo.account;

      lenderInfo.stakingLevel =
        await this.stakerMedalNFTContract.getLevelOfStaker(lenderAddress);

      lenderInfo.balanceBefore = await this.rALBTContract.balanceOf(
        lenderAddress
      );

      for (let index = 0; index < lenderInfo.actions.length; index++) {
        lenderInfo.actions[index].lastEpoch =
          await this.actionVerifierContract.lastEpochActionDonePerAccount(
            lenderAddress,
            web3.utils.keccak256(lenderInfo.actions[index].name)
          );
        lenderInfo.actions[index].rewardPerActionLevel =
          await this.actionVerifierContract.rewardPerActionPerLevel(
            web3.utils.keccak256(lenderInfo.actions[index].name),
            lenderInfo.stakingLevel
          );
        lenderInfo.actions[index].rewardPerActionPerLevelAfterFirstTime =
          await this.actionVerifierContract.rewardPerActionPerLevelAfterFirstTime(
            web3.utils.keccak256(lenderInfo.actions[index].name),
            lenderInfo.stakingLevel
          );
      }
      lendersDetails[index] = lenderInfo;
    }
    // Send Actions
    await increaseTime(ethers.provider, ONE_DAY);
    await this.actionVerifierContract
      .connect(this.lender3Signer)
      .provideRewardsForActions(allActions, signatures);

    // Update info after send actions
    for (let index = 0; index < lendersDetails.length; index++) {
      const lenderInfo = lendersDetails[index];
      const balanceRALBTAfterActions = await this.rALBTContract.balanceOf(
        lenderInfo.account
      );
      let isActionRepeated = false;
      // Calculete the rewards expected
      let rewards = lenderInfo.actions
        .map((act, actIndex) => {
          let reward = act.lastEpoch.eq(0)
            ? act.rewardPerActionLevel
            : act.rewardPerActionPerLevelAfterFirstTime;
          reward = reward.add(
            act.rewardPerActionPerLevelAfterFirstTime.mul(
              act.amountOfTimes.sub(1)
            )
          );
          if (act.amountOfTimes.gt(1)) {
            isActionRepeated = true;
          }
          return reward;
        })
        .reduce((reward1, reward2) => reward1.add(reward2));

      // Expect
      if (isActionRepeated) {
        expect(balanceRALBTAfterActions.sub(lenderInfo.balanceBefore)).to.be.lt(
          rewards
        );
      } else {
        expect(balanceRALBTAfterActions.sub(lenderInfo.balanceBefore)).to.be.eq(
          rewards
        );
      }
    }
  });
}
