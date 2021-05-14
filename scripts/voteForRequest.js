const Governance = artifacts.require('Governance');

if (!process.env.GOVERNANCE_ADDRESS)
  throw new Error('GOVERNANCE_ADDRESS missing from .env file');
if (!process.env.REQUEST_ID)
  throw new Error('REQUEST_ID missing from .env file');

async function main() {
  const governance = await Governance.at(process.env.GOVERNANCE_ADDRESS);

  // Get accounts
  const accounts = await web3.eth.getAccounts();
  const delegators = [accounts[5], accounts[6], accounts[7]];

  await governance.voteForRequest(process.env.REQUEST_ID, true, {
    from: delegators[0],
  });
  await governance.voteForRequest(process.env.REQUEST_ID, true, {
    from: delegators[1],
  });

  console.log('Done!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
