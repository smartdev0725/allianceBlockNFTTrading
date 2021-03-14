import BN from "bn.js";
const { time } = require("@openzeppelin/test-helpers");

export async function getTransactionTimestamp(txHash: string) {
  const blockNumber = (await web3.eth.getTransaction(txHash)).blockNumber;

  if(blockNumber == null) return new BN(0);

  const timestamp = (await web3.eth.getBlock(blockNumber)).timestamp;

  return new BN(timestamp);
}

export async function increaseTime(timeInterval: BN) {
	await time.advanceBlock();
	await time.increase(timeInterval);
}

export async function getCurrentTimestamp(){
  const now = await time.latest();
  return now;
}


