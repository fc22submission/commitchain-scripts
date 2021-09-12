import { BigNumber } from "ethers";

export interface EtherscanTransaction {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  transactionIndex: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  isError: string;
  txreceipt_status: string;
  input: string;
  contractAddress: string;
  cumulativeGasUsed: string;
  gasUsed: string;
  confirmations: string;
}

export interface ParsedEtherscanTransaction {
  blockNumber: number;
  timeStamp: string;
  hash: string;
  nonce: number;
  blockHash: string;
  transactionIndex: number;
  from: string;
  to: string;
  value: BigNumber;
  gas: number;
  gasPrice: BigNumber;
  isError: string;
  txreceipt_status: string;
  input: string;
  contractAddress: string;
  cumulativeGasUsed: number;
  gasUsed: number;
  confirmations: number;
}

export class EtherscanClient {
  public static parseTransaction(
    tx: EtherscanTransaction
  ): ParsedEtherscanTransaction {
    return {
      blockHash: tx.blockHash,
      blockNumber: parseInt(tx.blockNumber),
      confirmations: parseInt(tx.confirmations),
      contractAddress: tx.contractAddress,
      cumulativeGasUsed: parseInt(tx.cumulativeGasUsed),
      from: tx.from,
      gas: parseInt(tx.gas),
      gasPrice: BigNumber.from(tx.gasPrice),
      gasUsed: parseInt(tx.gasUsed),
      hash: tx.hash,
      input: tx.input,
      isError: tx.isError,
      nonce: parseInt(tx.nonce),
      timeStamp: tx.timeStamp,
      to: tx.to,
      transactionIndex: parseInt(tx.transactionIndex),
      txreceipt_status: tx.txreceipt_status,
      value: BigNumber.from(tx.value),
    };
  }
}
