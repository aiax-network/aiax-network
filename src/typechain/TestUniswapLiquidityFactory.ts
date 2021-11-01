/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Signer } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import { Contract, ContractFactory, Overrides } from "@ethersproject/contracts";

import type { TestUniswapLiquidity } from "./TestUniswapLiquidity";

export class TestUniswapLiquidityFactory extends ContractFactory {
  constructor(signer?: Signer) {
    super(_abi, _bytecode, signer);
  }

  deploy(
    _uni_router: string,
    overrides?: Overrides
  ): Promise<TestUniswapLiquidity> {
    return super.deploy(
      _uni_router,
      overrides || {}
    ) as Promise<TestUniswapLiquidity>;
  }
  getDeployTransaction(
    _uni_router: string,
    overrides?: Overrides
  ): TransactionRequest {
    return super.getDeployTransaction(_uni_router, overrides || {});
  }
  attach(address: string): TestUniswapLiquidity {
    return super.attach(address) as TestUniswapLiquidity;
  }
  connect(signer: Signer): TestUniswapLiquidityFactory {
    return super.connect(signer) as TestUniswapLiquidityFactory;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): TestUniswapLiquidity {
    return new Contract(
      address,
      _abi,
      signerOrProvider
    ) as TestUniswapLiquidity;
  }
}

const _abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_uni_router",
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
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    inputs: [],
    name: "owner",
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
        name: "tokenA",
        type: "address",
      },
      {
        internalType: "address",
        name: "tokenB",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "liquidity",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountAMin",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountBMin",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
    ],
    name: "redeemLiquidity",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "liquidity",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountTokenMin",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amountETHMin",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
    ],
    name: "redeemLiquidityETH",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_a",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_b",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "state_tokenContract",
        type: "address",
      },
    ],
    name: "transferTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const _bytecode =
  "0x608060405234801561001057600080fd5b50604051610a63380380610a638339818101604052602081101561003357600080fd5b505160006100486001600160e01b036100b716565b600080546001600160a01b0319166001600160a01b0383169081178255604051929350917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0908290a350600180546001600160a01b0319166001600160a01b03929092169190911790556100bb565b3390565b610999806100ca6000396000f3fe608060405234801561001057600080fd5b50600436106100625760003560e01c80630f77f6b2146100675780636f221a7a146100af578063715018a6146100ff5780638da5cb5b14610107578063d63dd1961461012b578063f2fde38b14610165575b600080fd5b6100ad600480360360c081101561007d57600080fd5b506001600160a01b0381358116916020810135916040820135916060810135916080820135169060a0013561018b565b005b6100ad600480360360e08110156100c557600080fd5b506001600160a01b038135811691602081013582169160408201359160608101359160808201359160a08101359091169060c00135610400565b6100ad6104cf565b61010f610571565b604080516001600160a01b039092168252519081900360200190f35b6100ad6004803603608081101561014157600080fd5b506001600160a01b0381358116916020810135916040820135916060013516610580565b6100ad6004803603602081101561017b57600080fd5b50356001600160a01b031661065e565b610193610756565b6000546001600160a01b039081169116146101e3576040805162461bcd60e51b81526020600482018190526024820152600080516020610944833981519152604482015290519081900360640190fd5b60006102d7600160009054906101000a90046001600160a01b03166001600160a01b031663c45a01556040518163ffffffff1660e01b815260040160206040518083038186803b15801561023657600080fd5b505afa15801561024a573d6000803e3d6000fd5b505050506040513d602081101561026057600080fd5b5051600154604080516315ab88c960e31b815290518b926001600160a01b03169163ad5c4648916004808301926020929190829003018186803b1580156102a657600080fd5b505afa1580156102ba573d6000803e3d6000fd5b505050506040513d60208110156102d057600080fd5b505161075a565b6001546040805163095ea7b360e01b81526001600160a01b039283166004820152600019602482015290519293509083169163095ea7b3916044808201926020929091908290030181600087803b15801561033157600080fd5b505af1158015610345573d6000803e3d6000fd5b505050506040513d602081101561035b57600080fd5b505060015460408051629d473b60e21b81526001600160a01b038a81166004830152602482018a90526044820189905260648201889052868116608483015260a4820186905282519316926302751cec9260c4808401939192918290030181600087803b1580156103cb57600080fd5b505af11580156103df573d6000803e3d6000fd5b505050506040513d60408110156103f557600080fd5b505050505050505050565b610408610756565b6000546001600160a01b03908116911614610458576040805162461bcd60e51b81526020600482018190526024820152600080516020610944833981519152604482015290519081900360640190fd5b60015460408051635d5155ef60e11b81526001600160a01b038a81166004830152898116602483015260448201899052606482018890526084820187905285811660a483015260c48201859052825193169263baa2abde9260e4808401939192918290030181600087803b1580156103cb57600080fd5b6104d7610756565b6000546001600160a01b03908116911614610527576040805162461bcd60e51b81526020600482018190526024820152600080516020610944833981519152604482015290519081900360640190fd5b600080546040516001600160a01b03909116907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0908390a3600080546001600160a01b0319169055565b6000546001600160a01b031690565b610588610756565b6000546001600160a01b039081169116146105d8576040805162461bcd60e51b81526020600482018190526024820152600080516020610944833981519152604482015290519081900360640190fd5b6040805163a9059cbb60e01b81526001600160a01b038681166004830152858501602483015291519183169163a9059cbb916044808201926020929091908290030181600087803b15801561062c57600080fd5b505af1158015610640573d6000803e3d6000fd5b505050506040513d602081101561065657600080fd5b505050505050565b610666610756565b6000546001600160a01b039081169116146106b6576040805162461bcd60e51b81526020600482018190526024820152600080516020610944833981519152604482015290519081900360640190fd5b6001600160a01b0381166106fb5760405162461bcd60e51b81526004018080602001828103825260268152602001806108f96026913960400191505060405180910390fd5b600080546040516001600160a01b03808516939216917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e091a3600080546001600160a01b0319166001600160a01b0392909216919091179055565b3390565b6000806000610769858561081a565b604080516bffffffffffffffffffffffff19606094851b811660208084019190915293851b81166034830152825160288184030181526048830184528051908501206001600160f81b031960688401529a90941b9093166069840152607d8301989098527f96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f609d808401919091528851808403909101815260bd909201909752805196019590952095945050505050565b600080826001600160a01b0316846001600160a01b0316141561086e5760405162461bcd60e51b815260040180806020018281038252602581526020018061091f6025913960400191505060405180910390fd5b826001600160a01b0316846001600160a01b03161061088e578284610891565b83835b90925090506001600160a01b0382166108f1576040805162461bcd60e51b815260206004820152601e60248201527f556e697377617056324c6962726172793a205a45524f5f414444524553530000604482015290519081900360640190fd5b925092905056fe4f776e61626c653a206e6577206f776e657220697320746865207a65726f2061646472657373556e697377617056324c6962726172793a204944454e544943414c5f4144445245535345534f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572a26469706673582212209cca010c8dde9bbba650188477b0e0d3b3479803744ae304d16f07ae0ca5a79464736f6c63430006060033";
