// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20AiaxTestToken is ERC20 {
  address public gravityAddress;
	constructor(address _gravityAddress) ERC20("Aiax test coin", "AXX") {
    gravityAddress = _gravityAddress;
    _mint(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266, 10000);
    _mint(0x70997970C51812dc3A010C7d01b50e0d17dc79C8, 10000);
    _mint(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC, 10000);
    _mint(0x90F79bf6EB2c4f870365E785982E1f101E93b906, 10000);
    _mint(0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65, 2**255); // acc #4
    //_mint(gravityAddress, 2**255); 
  }
}
