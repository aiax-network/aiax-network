/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Signer } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import { Contract, ContractFactory, Overrides } from "@ethersproject/contracts";

import type { Erc20AiaxToken } from "./Erc20AiaxToken";

export class Erc20AiaxTokenFactory extends ContractFactory {
  constructor(signer?: Signer) {
    super(_abi, _bytecode, signer);
  }

  deploy(
    _gravityAddress: string,
    overrides?: Overrides
  ): Promise<Erc20AiaxToken> {
    return super.deploy(
      _gravityAddress,
      overrides || {}
    ) as Promise<Erc20AiaxToken>;
  }
  getDeployTransaction(
    _gravityAddress: string,
    overrides?: Overrides
  ): TransactionRequest {
    return super.getDeployTransaction(_gravityAddress, overrides || {});
  }
  attach(address: string): Erc20AiaxToken {
    return super.attach(address) as Erc20AiaxToken;
  }
  connect(signer: Signer): Erc20AiaxTokenFactory {
    return super.connect(signer) as Erc20AiaxTokenFactory;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): Erc20AiaxToken {
    return new Contract(address, _abi, signerOrProvider) as Erc20AiaxToken;
  }
}

const _abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_gravityAddress",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
    ],
    name: "allowance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "approve",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [
      {
        internalType: "uint8",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "subtractedValue",
        type: "uint256",
      },
    ],
    name: "decreaseAllowance",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "gravityAddress",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "addedValue",
        type: "uint256",
      },
    ],
    name: "increaseAllowance",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transfer",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transferFrom",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const _bytecode =
  "0x60806040523480156200001157600080fd5b5060405162000c0238038062000c02833981016040819052620000349162000262565b6040518060400160405280600a81526020016920b4b0bc103a37b5b2b760b11b81525060405180604001604052806003815260200162082b0b60eb1b81525081600390805190602001906200008b929190620001bc565b508051620000a1906004906020840190620001bc565b5050600580546001600160a01b0319166001600160a01b03841617905550620000cd81600019620000d4565b50620002f8565b6001600160a01b0382166200012f5760405162461bcd60e51b815260206004820152601f60248201527f45524332303a206d696e7420746f20746865207a65726f206164647265737300604482015260640160405180910390fd5b806002600082825462000143919062000294565b90915550506001600160a01b038216600090815260208190526040812080548392906200017290849062000294565b90915550506040518181526001600160a01b038316906000907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9060200160405180910390a35050565b828054620001ca90620002bb565b90600052602060002090601f016020900481019282620001ee576000855562000239565b82601f106200020957805160ff191683800117855562000239565b8280016001018555821562000239579182015b82811115620002395782518255916020019190600101906200021c565b50620002479291506200024b565b5090565b5b808211156200024757600081556001016200024c565b6000602082840312156200027557600080fd5b81516001600160a01b03811681146200028d57600080fd5b9392505050565b60008219821115620002b657634e487b7160e01b600052601160045260246000fd5b500190565b600181811c90821680620002d057607f821691505b60208210811415620002f257634e487b7160e01b600052602260045260246000fd5b50919050565b6108fa80620003086000396000f3fe608060405234801561001057600080fd5b50600436106100b45760003560e01c806370a082311161007157806370a082311461014157806395d89b411461016a578063a457c2d714610172578063a9059cbb14610185578063d1e5fc6914610198578063dd62ed3e146101c357600080fd5b806306fdde03146100b9578063095ea7b3146100d757806318160ddd146100fa57806323b872dd1461010c578063313ce5671461011f578063395093511461012e575b600080fd5b6100c16101fc565b6040516100ce9190610737565b60405180910390f35b6100ea6100e53660046107a8565b61028e565b60405190151581526020016100ce565b6002545b6040519081526020016100ce565b6100ea61011a3660046107d2565b6102a4565b604051601281526020016100ce565b6100ea61013c3660046107a8565b610353565b6100fe61014f36600461080e565b6001600160a01b031660009081526020819052604090205490565b6100c161038f565b6100ea6101803660046107a8565b61039e565b6100ea6101933660046107a8565b610437565b6005546101ab906001600160a01b031681565b6040516001600160a01b0390911681526020016100ce565b6100fe6101d1366004610830565b6001600160a01b03918216600090815260016020908152604080832093909416825291909152205490565b60606003805461020b90610863565b80601f016020809104026020016040519081016040528092919081815260200182805461023790610863565b80156102845780601f1061025957610100808354040283529160200191610284565b820191906000526020600020905b81548152906001019060200180831161026757829003601f168201915b5050505050905090565b600061029b338484610444565b50600192915050565b60006102b1848484610568565b6001600160a01b03841660009081526001602090815260408083203384529091529020548281101561033b5760405162461bcd60e51b815260206004820152602860248201527f45524332303a207472616e7366657220616d6f756e74206578636565647320616044820152676c6c6f77616e636560c01b60648201526084015b60405180910390fd5b6103488533858403610444565b506001949350505050565b3360008181526001602090815260408083206001600160a01b0387168452909152812054909161029b91859061038a90869061089e565b610444565b60606004805461020b90610863565b3360009081526001602090815260408083206001600160a01b0386168452909152812054828110156104205760405162461bcd60e51b815260206004820152602560248201527f45524332303a2064656372656173656420616c6c6f77616e63652062656c6f77604482015264207a65726f60d81b6064820152608401610332565b61042d3385858403610444565b5060019392505050565b600061029b338484610568565b6001600160a01b0383166104a65760405162461bcd60e51b8152602060048201526024808201527f45524332303a20617070726f76652066726f6d20746865207a65726f206164646044820152637265737360e01b6064820152608401610332565b6001600160a01b0382166105075760405162461bcd60e51b815260206004820152602260248201527f45524332303a20617070726f766520746f20746865207a65726f206164647265604482015261737360f01b6064820152608401610332565b6001600160a01b0383811660008181526001602090815260408083209487168084529482529182902085905590518481527f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925910160405180910390a3505050565b6001600160a01b0383166105cc5760405162461bcd60e51b815260206004820152602560248201527f45524332303a207472616e736665722066726f6d20746865207a65726f206164604482015264647265737360d81b6064820152608401610332565b6001600160a01b03821661062e5760405162461bcd60e51b815260206004820152602360248201527f45524332303a207472616e7366657220746f20746865207a65726f206164647260448201526265737360e81b6064820152608401610332565b6001600160a01b038316600090815260208190526040902054818110156106a65760405162461bcd60e51b815260206004820152602660248201527f45524332303a207472616e7366657220616d6f756e7420657863656564732062604482015265616c616e636560d01b6064820152608401610332565b6001600160a01b038085166000908152602081905260408082208585039055918516815290812080548492906106dd90849061089e565b92505081905550826001600160a01b0316846001600160a01b03167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef8460405161072991815260200190565b60405180910390a350505050565b600060208083528351808285015260005b8181101561076457858101830151858201604001528201610748565b81811115610776576000604083870101525b50601f01601f1916929092016040019392505050565b80356001600160a01b03811681146107a357600080fd5b919050565b600080604083850312156107bb57600080fd5b6107c48361078c565b946020939093013593505050565b6000806000606084860312156107e757600080fd5b6107f08461078c565b92506107fe6020850161078c565b9150604084013590509250925092565b60006020828403121561082057600080fd5b6108298261078c565b9392505050565b6000806040838503121561084357600080fd5b61084c8361078c565b915061085a6020840161078c565b90509250929050565b600181811c9082168061087757607f821691505b6020821081141561089857634e487b7160e01b600052602260045260246000fd5b50919050565b600082198211156108bf57634e487b7160e01b600052601160045260246000fd5b50019056fea2646970667358221220e7d828bf299fa9895dcd879c8f68baadcd547eefdb7f5143ed0ea645cf6c2c7d64736f6c63430008090033";
