import {
  ETHEREUM_NETWORK,
  INFURA_PROJECT_ID,
  optimismTransactionChainContractAddress,
} from "./config";
import { providers, ethers, BigNumber, Contract } from "ethers";
import { ovmTransactionChainAbi } from "./optimismAbi";

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

export interface OptimismTransactionBatch {
  batchIndex: BigNumber;
  batchSize: BigNumber;
  prevTotalElements: BigNumber;
  gasUsed: number;
}

async function processOVMTransactionChain(
  events: providers.Log[],
  arbitrumTransactionContract: Contract,
  provider: providers.InfuraProvider
) {
  const batches: OptimismTransactionBatch[] = [];

  for (let i = 0; i < events.length; i++) {
    const parsedEvent = arbitrumTransactionContract.interface.parseLog({
      topics: events[i].topics,
      data: events[i].data,
    });

    const batchIndex = parsedEvent.args._batchIndex;
    const batchSize = parsedEvent.args._batchSize;
    const prevTotalElements = parsedEvent.args._prevTotalElements;

    const txReceipt = await provider.getTransactionReceipt(
      events[i].transactionHash
    );

    batches.push({
      batchIndex,
      batchSize,
      prevTotalElements,
      gasUsed: txReceipt.gasUsed.toNumber(),
    });
  }

  let totalTx = BigNumber.from(0);
  let totalGasUsed = BigNumber.from(0);
  let batchIndex = 120323123;

  for (let i = 0; i < batches.length; i++) {
    const txCount = batches[i].batchSize;
    const averageGas = BigNumber.from(batches[i].gasUsed).div(txCount);

    totalTx = totalTx.add(txCount);
    totalGasUsed = totalGasUsed.add(batches[i].gasUsed);

    if (batches[i].batchIndex.lt(batchIndex)) {
      batchIndex = batches[i].batchIndex.toNumber();
    }
    // Keep track of all transactions and gas ued per tx
    // Print log to make it visiable / easy to audit that way.
    console.log(
      "prevTotalElements",
      batches[i].prevTotalElements.toString(),
      "batchSize",
      batches[i].batchSize.toString(),
      "batchIndex",
      batches[i].batchIndex.toString(),
      "gasUsed",
      batches[i].gasUsed,
      "averageGas",
      averageGas.toString()
    );
  }

  return { txNo: totalTx, gasUsed: totalGasUsed, batchIndex };
}

(async () => {
  const { provider } = await setup();

  const transactionContract = new ethers.Contract(
    optimismTransactionChainContractAddress,
    ovmTransactionChainAbi,
    provider
  );

  let blockNo = (await provider.getBlockNumber()) - 1000;

  const topics = transactionContract.filters.TransactionBatchAppended();

  let totalTx = BigNumber.from(0);
  let totalGasUsed = BigNumber.from(0);

  while (true) {
    // Fetch X blocks worth of sequencer numbers...
    const search = 2000;
    const events = await provider.getLogs({
      topics: topics.topics,
      address: topics.address,
      toBlock: blockNo,
      fromBlock: blockNo - search,
    });
    blockNo = blockNo - search;

    // Process the batches...
    const { txNo, gasUsed, batchIndex } = await processOVMTransactionChain(
      events,
      transactionContract,
      provider
    );

    // Keep running tally
    totalTx = totalTx.add(txNo);
    totalGasUsed = totalGasUsed.add(gasUsed);

    if (batchIndex === 0) {
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
