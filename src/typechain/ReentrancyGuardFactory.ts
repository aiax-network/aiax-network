/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer } from "ethers";
import { Provider } from "@ethersproject/providers";

import type { ReentrancyGuard } from "./ReentrancyGuard";

export class ReentrancyGuardFactory {
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): ReentrancyGuard {
    return new Contract(address, _abi, signerOrProvider) as ReentrancyGuard;
  }
}

const _abi = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
];
