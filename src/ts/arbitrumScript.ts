import {
  arbitrumTransactionContractAddress,
  ETHEREUM_NETWORK,
  INFURA_PROJECT_ID,
} from "./config";
import { providers, ethers, BigNumber, Contract } from "ethers";
import { arbitrumAbi } from "./arbitrumAbi";

/**
 * Set up the provider and wallet
 */
export async function setup() {
  const infuraProvider = new providers.InfuraProvider(
    ETHEREUM_NETWORK,
    INFURA_PROJECT_ID
  );

  return { provider: infuraProvider };
}

/**
 * Wait function
 * @param ms Milli-seconds
 */
export async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ArbitrumSequencerBatch {
  firstMessageNum: BigNumber;
  newMessageCount: BigNumber;
  seqBatchIndex: BigNumber;
  gasUsed: number;
}

async function processSequencerInboxEvents(
  events: providers.Log[],
  arbitrumTransactionContract: Contract,
  provider: providers.InfuraProvider
) {
  const batches: ArbitrumSequencerBatch[] = [];

  for (let i = 0; i < events.length; i++) {
    const parsedEvent = arbitrumTransactionContract.interface.parseLog({
      topics: events[i].topics,
      data: events[i].data,
    });

    const firstMessageNum = parsedEvent.args.firstMessageNum;
    const newMessageCount = parsedEvent.args.newMessageCount;
    const seqBatchIndex = parsedEvent.args.seqBatchIndex;

    const txReceipt = await provider.getTransactionReceipt(
      events[i].transactionHash
    );

    batches.push({
      firstMessageNum,
      newMessageCount,
      seqBatchIndex,
      gasUsed: txReceipt.gasUsed.toNumber(),
    });
  }

  let totalTx = BigNumber.from(0);
  let totalGasUsed = BigNumber.from(0);
  let seqBatchIndex = 120323123;

  for (let i = 0; i < batches.length; i++) {
    const txCount = batches[i].newMessageCount
      .sub(batches[i].firstMessageNum)
      .toNumber();
    const averageGas = BigNumber.from(batches[i].gasUsed).div(txCount);

    totalTx = totalTx.add(txCount);
    totalGasUsed = totalGasUsed.add(batches[i].gasUsed);

    if (batches[i].seqBatchIndex.lt(seqBatchIndex)) {
      seqBatchIndex = batches[i].seqBatchIndex.toNumber();
    }
    // Keep track of all transactions and gas ued per tx
    // Print log to make it visiable / easy to audit that way.
    console.log(
      "firstMessageNum",
      batches[i].firstMessageNum.toString(),
      "newMessageCount",
      batches[i].newMessageCount.toString(),
      "seqBatchIndex",
      batches[i].seqBatchIndex.toString(),
      "gasUsed",
      batches[i].gasUsed,
      "totalMessages",
      totalTx.toString(),
      "averageGas",
      averageGas.toString()
    );
  }

  return { txNo: totalTx, gasUsed: totalGasUsed, seqBatchIndex };
}
(async () => {
  const { provider } = await setup();

  const arbitrumTransactionContract = new ethers.Contract(
    arbitrumTransactionContractAddress,
    arbitrumAbi,
    provider
  );

  let blockNo = (await provider.getBlockNumber()) - 1000;

  const topics =
    arbitrumTransactionContract.filters.SequencerBatchDeliveredFromOrigin();

  let totalTx = BigNumber.from(0);
  let totalGasUsed = BigNumber.from(0);

  while (true) {
    // Fetch X blocks worth of sequencer numbers...
    const search = 10000;
    const events = await provider.getLogs({
      topics: topics.topics,
      address: topics.address,
      toBlock: blockNo,
      fromBlock: blockNo - search,
    });
    blockNo = blockNo - search;

    // Process the batches...
    const { txNo, gasUsed, seqBatchIndex } = await processSequencerInboxEvents(
      events,
      arbitrumTransactionContract,
      provider
    );

    // Keep running tally
    totalTx = totalTx.add(txNo);
    totalGasUsed = totalGasUsed.add(gasUsed);

    if (seqBatchIndex === 0) {
      console.log("FINAL RESULTS");
      console.log("Total transactions: " + totalTx.toString());
      console.log("Total gas used: " + totalGasUsed.toString());
      console.log("Average gas cost: " + totalGasUsed.div(totalTx).toString());
      return;
    }
  }

  // console.log(events);
  // await getTransactionData(
  //   arbitrumTransactionContractAddress,
  //   blockNo,
  //   arbitrumTransactionContract
  // );
})().catch((e) => {
  console.log(e);
});
