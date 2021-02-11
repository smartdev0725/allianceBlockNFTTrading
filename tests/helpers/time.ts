import BN from "bn.js";

export async function getTransactionTimestamp(txHash: string) {
  const blockNumber = (await web3.eth.getTransaction(txHash)).blockNumber;

  if(blockNumber == null) return new BN(0);

  const timestamp = (await web3.eth.getBlock(blockNumber)).timestamp;

  return new BN(timestamp);
}
