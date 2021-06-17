import {ethers} from 'hardhat';
import chai, {expect} from 'chai';
const {expectRevert} = require('@openzeppelin/test-helpers');
import {solidity} from 'ethereum-waffle';

chai.use(solidity);

export default async function suite() {
  const name = 'Reputational AllianceBlock Token';
  const symbol = 'rALBT';
  const decimals = 18;

  describe('Succeeds', async function () {
    beforeEach(async function () {});

    describe('name', function () {
      it('should return', async function () {
        const nameReturned = await this.rALBTContract.name();
        expect(nameReturned).to.eq(name);
      });
    });

    describe('symbol', function () {
      it('should return', async function () {
        const symbolReturned = await this.rALBTContract.symbol();
        expect(symbolReturned).to.eq(symbol);
      });
    });

    describe('decimals', function () {
      it('should return', async function () {
        const decimalsReturned = await this.rALBTContract.decimals();
        expect(decimalsReturned).to.eq(decimals);
      });
    });

    describe('balanceOf', () => {
      it('should return 0 as default', async function () {
        const balance = await this.rALBTContract.balanceOf(this.lender1);
        expect(balance.toNumber()).to.be.equal(0);
      });

      it('should return amount', async function () {
        const mintAmount = 1000;
        await this.rALBTContract
          .connect(this.deployerSigner)
          .mintTo(this.lender1, mintAmount);
        const balance = await this.rALBTContract.balanceOf(this.lender1);
        expect(balance).to.be.equal(mintAmount);
      });
    });

    describe('mint', () => {
      it('should fail if a account other than owner call', async function () {
        const amount = 10000;

        await expectRevert(
          this.rALBTContract
            .connect(this.lender1Signer)
            .mintTo(this.lender1, amount),
          'Ownable: caller is not the owner'
        );
      });

      it('should fail if address to is zero', async function () {
        const amount = 10000;

        await expectRevert(
          this.rALBTContract
            .connect(this.deployerSigner)
            .mintTo(ethers.constants.AddressZero, amount),
          'ERC20: mint to the zero address'
        );
      });

      it('should success', async function () {
        const amount = 10000;

        await expect(
          this.rALBTContract
            .connect(this.deployerSigner)
            .mintTo(this.lender1, amount)
        ).to.emit(this.rALBTContract, 'Transfer');

        const balance = await this.rALBTContract.balanceOf(this.lender1);
        expect(balance.toNumber()).to.eq(amount);
      });
    });

    describe('burn', () => {
      it('should fail if a account other than owner call', async function () {
        const amount = 10000;

        await expectRevert(
          this.rALBTContract
            .connect(this.lender1Signer)
            .burnFrom(this.lender1, amount),
          'Ownable: caller is not the owner'
        );
      });

      it('should fail if address to is zero', async function () {
        const amount = 10000;

        await expectRevert(
          this.rALBTContract
            .connect(this.deployerSigner)
            .burnFrom(ethers.constants.AddressZero, amount),
          'ERC20: burn from the zero address'
        );
      });

      it("should fail if a account doesn't have enough balance", async function () {
        const amount = 10000;

        await expect(
          this.rALBTContract
            .connect(this.deployerSigner)
            .burnFrom(this.lender1, amount)
        ).to.be.reverted;
      });

      it('should success', async function () {
        const initialBalance = 10000;
        const amount = 1000;

        await this.rALBTContract
          .connect(this.deployerSigner)
          .mintTo(this.lender1, initialBalance);

        await expect(
          this.rALBTContract
            .connect(this.deployerSigner)
            .burnFrom(this.lender1, amount)
        ).to.emit(this.rALBTContract, 'Transfer');

        const newBalance = initialBalance - amount;
        const balance = await this.rALBTContract.balanceOf(this.lender1);
        expect(balance.toNumber()).to.be.equal(newBalance);
      });
    });

    describe('multiMintTo', () => {
      it('should fail if a account other than owner call', async function () {
        await expectRevert(
          this.rALBTContract.connect(this.lender1Signer).multiMintTo([], []),
          'Ownable: caller is not the owner'
        );
      });

      it('should fail if length of parameters are not equal', async function () {
        await expectRevert(
          this.rALBTContract
            .connect(this.deployerSigner)
            .multiMintTo([this.lender1, this.lender2], [10000]),
          'Invalid length of to or amounts'
        );
      });

      it('should success', async function () {
        const amount1 = 10000;
        const amount2 = 20000;

        await expect(
          this.rALBTContract
            .connect(this.deployerSigner)
            .multiMintTo([this.lender1, this.lender2], [amount1, amount2])
        ).to.emit(this.rALBTContract, 'Transfer');

        const balance1 = await this.rALBTContract.balanceOf(this.lender1);
        const balance2 = await this.rALBTContract.balanceOf(this.lender2);
        const totalSupply = await this.rALBTContract.totalSupply();
        expect(balance1.toNumber()).to.be.equal(amount1);
        expect(balance2.toNumber()).to.be.equal(amount2);
        expect(totalSupply.toNumber()).to.be.equal(amount1 + amount2);
      });

      it('should success with zero addresses', async function () {
        const amount1 = 10000;
        const amount2 = 20000;

        await expect(
          this.rALBTContract
            .connect(this.deployerSigner)
            .multiMintTo(
              [ethers.constants.AddressZero, ethers.constants.AddressZero],
              [amount1, amount2]
            )
        ).to.not.emit(this.rALBTContract, 'Transfer');

        const totalSupply = await this.rALBTContract.totalSupply();
        expect(totalSupply.toNumber()).to.be.equal(0);
      });
    });
  });
}
