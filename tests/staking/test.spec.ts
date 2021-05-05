import checkStaking from './checkStaking';

import BN from 'bn.js';
import { toWei } from 'web3-utils';

const Staking = artifacts.require('Staking');
const ALBT = artifacts.require('ALBT');

describe('Staking', function () {
  before(async function () {
    const accounts = await web3.eth.getAccounts();

    this.owner = accounts[0];
    this.rewardDistributor = accounts[1];
    this.stakers = [accounts[2], accounts[3], accounts[4]];

    // Deploy contracts.
    this.albt = await ALBT.new();
    this.staking = await Staking.new(this.albt.address, [ new BN(toWei('1000')), new BN(toWei('1000'))]);

    // Set reward distributor.
    await this.staking.setRewardDistribution(this.rewardDistributor);

    // Transfer tokens to reward distributor.
    const amountForDistributor = (new BN(toWei('100000000'))).toString();
    await this.albt.mint(this.rewardDistributor, amountForDistributor, { from: this.owner });
    await this.albt.approve(this.staking.address, amountForDistributor, { from: this.rewardDistributor });

    // Transfer albt tokens to stakers.
    const amountForStakers = (new BN(toWei('1000000'))).toString();

    for(let i = 0; i < this.stakers.length; i++) {
      await this.albt.mint(this.stakers[i], amountForStakers, { from: this.owner });
      await this.albt.approve(this.staking.address, amountForStakers, { from: this.stakers[i] });
    }
  });

  describe('When checking staking rewards', checkStaking.bind(this));
});
