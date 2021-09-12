import { BigNumber } from "ethers";
import { fetch } from "cross-fetch";
import { EtherscanClient, ParsedEtherscanTransaction } from "./etherscanClient";

const committee = "0x16ba0f221664a5189cf2c1a7af0d3abfc70aa295".toLowerCase();
const bridge = "0x5fdcca53617f4d2b9134b29090c87d01058e27e9".toLowerCase();
const memoryfactregistry =
  "0x076cf2113b6eed19883a92454c473998fc8479e5".toLowerCase();
const proofverifier =
  "0x45769d52d47e9cbfac9a2df68c2051adb0630f17".toLowerCase();
const fristatement = "0xe74999fbc71455462c8143b56797d3bb84c1064b".toLowerCase();
const verifymerkle = "0x26ec188f555f0c491083d280cf8162e9d5e0d386".toLowerCase();

interface TotalInfo {
  tx: number;
  gasUsed: number;
}

const immutable = "0x9b7f7d0d23d4cace5a3157752d0d4e4bf25e927e";
const key = "KMB7425HNJKGYXN54PJ52ZBN4F1X29F1V6";

async function fetchTransactionDataForAddress(
  contractAddress,
  blockNo,
  apiToken
) {
  const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${contractAddress}&startblock=${blockNo}&endblock=99999999&sort=asc&apikey=${apiToken}`;

  const response = await fetch(url);
  const data = await response.json();

  const txList: ParsedEtherscanTransaction[] = [];

  if (data.status == 1) {
    for (let i = 0; i < data.result.length; i++) {
      try {
        txList.push(EtherscanClient.parseTransaction(data.result[i]));
      } catch (e) {}
    }
  }

  return txList;
}

/**
 * Wait function
 * @param ms Milli-seconds
 */
export async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
(async () => {
  const txList = await fetchTransactionDataForAddress(immutable, 0, key);

  const committeeTotal: TotalInfo = { gasUsed: 0, tx: 0 };
  const bridgeTotal: TotalInfo = { gasUsed: 0, tx: 0 };
  const memoryfactregistryTotal: TotalInfo = { gasUsed: 0, tx: 0 };
  const proofverifierTotal: TotalInfo = { gasUsed: 0, tx: 0 };
  const fristatementTotal: TotalInfo = { gasUsed: 0, tx: 0 };
  const verifymerkleTotal: TotalInfo = { gasUsed: 0, tx: 0 };

  console.log(txList.length);

  for (let i = 0; i < txList.length; i++) {
    switch (txList[i].to.toLowerCase()) {
      case committee:
        committeeTotal.gasUsed = committeeTotal.gasUsed + txList[i].gasUsed;
        committeeTotal.tx = committeeTotal.tx + 1;
        break;
      case bridge:
        bridgeTotal.gasUsed = bridgeTotal.gasUsed + txList[i].gasUsed;
        bridgeTotal.tx = bridgeTotal.tx + 1;
        break;
      case memoryfactregistry:
        memoryfactregistryTotal.gasUsed =
          memoryfactregistryTotal.gasUsed + txList[i].gasUsed;
        memoryfactregistryTotal.tx = memoryfactregistryTotal.tx + 1;
        break;
      case proofverifier:
        proofverifierTotal.gasUsed =
          proofverifierTotal.gasUsed + txList[i].gasUsed;
        proofverifierTotal.tx = proofverifierTotal.tx + 1;
        break;
      case fristatement:
        fristatementTotal.gasUsed =
          fristatementTotal.gasUsed + txList[i].gasUsed;
        fristatementTotal.tx = fristatementTotal.tx + 1;
        break;
      case verifymerkle:
        verifymerkleTotal.gasUsed =
          verifymerkleTotal.gasUsed + txList[i].gasUsed;
        verifymerkleTotal.tx = verifymerkleTotal.tx + 1;
        break;
      default:
        console.log(txList[i].to);
        break;
    }
  }

  console.log(
    "Committee",
    BigNumber.from(committeeTotal.gasUsed).div(committeeTotal.tx).toString(),
    ",",
    committeeTotal.tx
  );

  console.log(
    "Bridge,",
    BigNumber.from(bridgeTotal.gasUsed).div(bridgeTotal.tx).toString(),
    ",",
    bridgeTotal.tx
  );

  console.log(
    "Memory fact registry,",
    BigNumber.from(memoryfactregistryTotal.gasUsed)
      .div(memoryfactregistryTotal.tx)
      .toString(),
    ",",
    memoryfactregistryTotal.tx
  );

  console.log(
    "Proof verifier,",
    BigNumber.from(proofverifierTotal.gasUsed)
      .div(proofverifierTotal.tx)
      .toString(),
    ",",
    proofverifierTotal.tx
  );

  console.log(
    "Fri statement,",
    BigNumber.from(fristatementTotal.gasUsed)
      .div(fristatementTotal.tx)
      .toString(),
    ",",
    fristatementTotal.tx
  );

  console.log(
    "Verify merkle,",
    BigNumber.from(verifymerkleTotal.gasUsed)
      .div(verifymerkleTotal.tx)
      .toString(),
    ",",
    verifymerkleTotal.tx
  );

  console.log(
    "Total transactions,",
    verifymerkleTotal.tx +
      fristatementTotal.tx +
      proofverifierTotal.tx +
      memoryfactregistryTotal.tx +
      bridgeTotal.tx +
      committeeTotal.tx,
    ",Expected total,",
    txList.length
  );
})().catch((e) => {
  console.log(e);
});
