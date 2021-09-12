import {
  ETHEREUM_NETWORK,
  INFURA_PROJECT_ID,
  zkSyncContractAddress,
} from "./config";
import { providers, utils, ethers, BigNumber, Contract } from "ethers";
import { zkSyncAbi } from "./zksyncAbi";
import * as zksync from "zksync";
import { ApiBlockInfo } from "zksync/build/types";

interface ZkBlock {
  blockNumber: number;
  newStateRoot: string;
  blockSize: number;
  commitTxHash: string;
  verifyTxHash: string;
  committedAt: string;
  finalizedAt: string;
  status: string;
}
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

async function processZkSync(
  events: providers.Log[],
  zkSyncContract: Contract,
  provider: providers.InfuraProvider
) {
  const keys = [];
  const txHashToBlocks = new Map<string, number[]>();

  // Organise all transaction hashes -> block numbers
  for (let i = 0; i < events.length; i++) {
    const parsedEvent = zkSyncContract.interface.parseLog({
      topics: events[i].topics,
      data: events[i].data,
    });

    // Have we seen this transaction hash yet?
    if (!txHashToBlocks.get(events[i].transactionHash)) {
      keys.push(events[i].transactionHash);
      txHashToBlocks.set(events[i].transactionHash, []);
    }

    // OK lets store block number...
    const map = txHashToBlocks.get(events[i].transactionHash);
    map.push(parsedEvent.args.blockNumber);
    txHashToBlocks.set(events[i].transactionHash, map);

    // console.log(events[i].transactionHash, parsedEvent.args.blockNumber);
  }

  let totalTx = BigNumber.from(0);
  let totalGasUsed = BigNumber.from(0);
  let batchIndex = 120323123;

  for (let i = 0; i < keys.length; i++) {
    const receipt = await getReceipt(provider, keys[i]);
    totalGasUsed = totalGasUsed.add(receipt.gasUsed);
    const blockNumbers = txHashToBlocks.get(keys[i]);

    for (let j = 0; j < blockNumbers.length; j++) {
      const zksyncProvider = await zksync.getDefaultRestProvider("mainnet");
      const res: ApiBlockInfo = await getBlockInfo(
        zksyncProvider,
        blockNumbers[j]
      );

      console.log("block", blockNumbers[j], "tx", res.blockSize);
      totalTx = totalTx.add(res.blockSize);

      if (blockNumbers[j] < batchIndex) {
        batchIndex = blockNumbers[j];
      }
    }
  }

  console.log(
    "Total Tx",
    totalTx.toString(),
    "Total gas used",
    totalGasUsed.toString(),
    "Average gas",
    totalGasUsed.div(totalTx).toString(),
    "Smallest index",
    batchIndex
  );

  return { txNo: totalTx, gasUsed: totalGasUsed, batchIndex };
}

const limit = 5;

async function getBlockInfo(
  provider: zksync.RestProvider,
  blockNo: number,
  retries = 0
) {
  try {
    return await provider.blockByPosition(blockNo);
  } catch (e) {
    if (retries < limit) {
      await wait(5000);

      return getBlockInfo(provider, blockNo, retries + 1);
    }
    console.log(e);
  }
}

async function getReceipt(
  provider: providers.Provider,
  txHash: string,
  retries = 0
) {
  try {
    return await provider.getTransactionReceipt(txHash);
  } catch (e) {
    if (retries < limit) {
      await wait(5000);

      return getReceipt(provider, txHash, retries + 1);
    }
    console.log(e);
  }
}

async function getLogs(
  provider: providers.Provider,
  topics: ethers.EventFilter,
  blockNo: number,
  search: number,
  retries = 0
) {
  try {
    return await provider.getLogs({
      topics: topics.topics,
      address: topics.address,
      toBlock: blockNo,
      fromBlock: blockNo - search,
    });
  } catch (e) {
    if (retries < limit) {
      await wait(5000);

      return getLogs(provider, topics, blockNo, search, retries + 1);
    }
    console.log(e);
  }
}

(async () => {
  const { provider } = await setup();

  const transactionContract = new ethers.Contract(
    zkSyncContractAddress,
    zkSyncAbi,
    provider
  );

  let blockNo = (await provider.getBlockNumber()) - 1000;

  const topics = transactionContract.filters.BlockCommit();

  let totalTx = BigNumber.from(0);
  let totalGasUsed = BigNumber.from(0);

  while (true) {
    // Fetch X blocks worth of sequencer numbers...
    const search = 2000;

    const events = await getLogs(provider, topics, blockNo, search);
    blockNo = blockNo - search;

    // Process the batches...
    const { txNo, gasUsed, batchIndex } = await processZkSync(
      events,
      transactionContract,
      provider
    );

    // Keep running tally
    totalTx = totalTx.add(txNo);
    totalGasUsed = totalGasUsed.add(gasUsed);

    console.log("On going average", totalGasUsed.div(totalTx).toString());
    if (batchIndex === 0) {
      console.log("FINAL RESULTS");
      console.log("Total transactions: " + totalTx.toString());
      console.log("Total gas used: " + totalGasUsed.toString());
      console.log("Average gas cost: " + totalGasUsed.div(totalTx).toString());
      return;
    }
  }
})().catch((e) => {
  console.log(e);
});
