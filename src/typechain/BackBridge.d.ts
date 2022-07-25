/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import {
  ethers,
  EventFilter,
  Signer,
  BigNumber,
  BigNumberish,
  PopulatedTransaction,
} from "ethers";
import {
  Contract,
  ContractTransaction,
  Overrides,
  CallOverrides,
} from "@ethersproject/contracts";
import { BytesLike } from "@ethersproject/bytes";
import { Listener, Provider } from "@ethersproject/providers";
import { FunctionFragment, EventFragment, Result } from "@ethersproject/abi";

interface BackBridgeInterface extends ethers.utils.Interface {
  functions: {
    "RequestBatchTx(address)": FunctionFragment;
    "SendToEthereum(address,address,uint256,address,uint256)": FunctionFragment;
  };

  encodeFunctionData(
    functionFragment: "RequestBatchTx",
    values: [string]
  ): string;
  encodeFunctionData(
    functionFragment: "SendToEthereum",
    values: [string, string, BigNumberish, string, BigNumberish]
  ): string;

  decodeFunctionResult(
    functionFragment: "RequestBatchTx",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "SendToEthereum",
    data: BytesLike
  ): Result;

  events: {
    "MsgRequestBatchTx(address,address)": EventFragment;
    "MsgSendToEthereum(address,address,address,uint256,address,uint256)": EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: "MsgRequestBatchTx"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "MsgSendToEthereum"): EventFragment;
}

export class BackBridge extends Contract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  on(event: EventFilter | string, listener: Listener): this;
  once(event: EventFilter | string, listener: Listener): this;
  addListener(eventName: EventFilter | string, listener: Listener): this;
  removeAllListeners(eventName: EventFilter | string): this;
  removeListener(eventName: any, listener: Listener): this;

  interface: BackBridgeInterface;

  functions: {
    RequestBatchTx(
      denom__eth_erc20: string,
      overrides?: Overrides
    ): Promise<ContractTransaction>;

    "RequestBatchTx(address)"(
      denom__eth_erc20: string,
      overrides?: Overrides
    ): Promise<ContractTransaction>;

    SendToEthereum(
      ethereumRecipient: string,
      amount__eth_erc20: string,
      amount__amount: BigNumberish,
      bridgeFee__eth_erc20: string,
      bridgeFee__amount: BigNumberish,
      overrides?: Overrides
    ): Promise<ContractTransaction>;

    "SendToEthereum(address,address,uint256,address,uint256)"(
      ethereumRecipient: string,
      amount__eth_erc20: string,
      amount__amount: BigNumberish,
      bridgeFee__eth_erc20: string,
      bridgeFee__amount: BigNumberish,
      overrides?: Overrides
    ): Promise<ContractTransaction>;
  };

  RequestBatchTx(
    denom__eth_erc20: string,
    overrides?: Overrides
  ): Promise<ContractTransaction>;

  "RequestBatchTx(address)"(
    denom__eth_erc20: string,
    overrides?: Overrides
  ): Promise<ContractTransaction>;

  SendToEthereum(
    ethereumRecipient: string,
    amount__eth_erc20: string,
    amount__amount: BigNumberish,
    bridgeFee__eth_erc20: string,
    bridgeFee__amount: BigNumberish,
    overrides?: Overrides
  ): Promise<ContractTransaction>;

  "SendToEthereum(address,address,uint256,address,uint256)"(
    ethereumRecipient: string,
    amount__eth_erc20: string,
    amount__amount: BigNumberish,
    bridgeFee__eth_erc20: string,
    bridgeFee__amount: BigNumberish,
    overrides?: Overrides
  ): Promise<ContractTransaction>;

  callStatic: {
    RequestBatchTx(
      denom__eth_erc20: string,
      overrides?: CallOverrides
    ): Promise<void>;

    "RequestBatchTx(address)"(
      denom__eth_erc20: string,
      overrides?: CallOverrides
    ): Promise<void>;

    SendToEthereum(
      ethereumRecipient: string,
      amount__eth_erc20: string,
      amount__amount: BigNumberish,
      bridgeFee__eth_erc20: string,
      bridgeFee__amount: BigNumberish,
      overrides?: CallOverrides
    ): Promise<void>;

    "SendToEthereum(address,address,uint256,address,uint256)"(
      ethereumRecipient: string,
      amount__eth_erc20: string,
      amount__amount: BigNumberish,
      bridgeFee__eth_erc20: string,
      bridgeFee__amount: BigNumberish,
      overrides?: CallOverrides
    ): Promise<void>;
  };

  filters: {
    MsgRequestBatchTx(
      _denom__eth_erc20: string | null,
      _signer__amount: string | null
    ): EventFilter;

    MsgSendToEthereum(
      _sender: string | null,
      _ethereumRecipient: string | null,
      _amount__eth_erc20: string | null,
      _amount__amount: null,
      _bridgeFee__eth_erc20: null,
      _bridgeFee__amount: null
    ): EventFilter;
  };

  estimateGas: {
    RequestBatchTx(
      denom__eth_erc20: string,
      overrides?: Overrides
    ): Promise<BigNumber>;

    "RequestBatchTx(address)"(
      denom__eth_erc20: string,
      overrides?: Overrides
    ): Promise<BigNumber>;

    SendToEthereum(
      ethereumRecipient: string,
      amount__eth_erc20: string,
      amount__amount: BigNumberish,
      bridgeFee__eth_erc20: string,
      bridgeFee__amount: BigNumberish,
      overrides?: Overrides
    ): Promise<BigNumber>;

    "SendToEthereum(address,address,uint256,address,uint256)"(
      ethereumRecipient: string,
      amount__eth_erc20: string,
      amount__amount: BigNumberish,
      bridgeFee__eth_erc20: string,
      bridgeFee__amount: BigNumberish,
      overrides?: Overrides
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    RequestBatchTx(
      denom__eth_erc20: string,
      overrides?: Overrides
    ): Promise<PopulatedTransaction>;

    "RequestBatchTx(address)"(
      denom__eth_erc20: string,
      overrides?: Overrides
    ): Promise<PopulatedTransaction>;

    SendToEthereum(
      ethereumRecipient: string,
      amount__eth_erc20: string,
      amount__amount: BigNumberish,
      bridgeFee__eth_erc20: string,
      bridgeFee__amount: BigNumberish,
      overrides?: Overrides
    ): Promise<PopulatedTransaction>;

    "SendToEthereum(address,address,uint256,address,uint256)"(
      ethereumRecipient: string,
      amount__eth_erc20: string,
      amount__amount: BigNumberish,
      bridgeFee__eth_erc20: string,
      bridgeFee__amount: BigNumberish,
      overrides?: Overrides
    ): Promise<PopulatedTransaction>;
  };
}