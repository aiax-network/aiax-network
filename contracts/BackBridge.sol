// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

contract BackBridge {
	event MsgSendToEthereum(
		address indexed _sender,
		address indexed _ethereumRecipient,
		address indexed _amount__eth_erc20,
		uint256 _amount__amount,
		address _bridgeFee__eth_erc20,
		uint256 _bridgeFee__amount
	);

	event MsgRequestBatchTx(
		address indexed _denom__eth_erc20,
		address indexed _signer__amount
	);

	function SendToEthereum(
		address ethereumRecipient,
		address amount__eth_erc20,
		uint256 amount__amount,
		address bridgeFee__eth_erc20,
		uint256 bridgeFee__amount
	) public {
		emit MsgSendToEthereum(
			msg.sender,
			ethereumRecipient,
			amount__eth_erc20,
			amount__amount,
			bridgeFee__eth_erc20,
			bridgeFee__amount
		);
	}

	function RequestBatchTx(
		address denom__eth_erc20
	) public {
		emit MsgRequestBatchTx(
			denom__eth_erc20,
			msg.sender
		);
	}
}