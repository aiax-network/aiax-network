// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20AiaxToken is ERC20 {
  address public gravityAddress;

  constructor(address _gravityAddress) ERC20("Aiax token", "AXX") {
    gravityAddress = _gravityAddress; 
    _mint(_gravityAddress, 2**256 - 1);
  }
}
