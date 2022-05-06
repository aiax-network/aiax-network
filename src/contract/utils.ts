import { assert } from "console";
import { ContractTransaction } from "ethers";
import { Gravity } from "../typechain";

export async function getGravityNativeToken(gravity: Gravity): Promise<string | null> {
    const deployReceipt = await (gravity.deployTransaction as ContractTransaction).wait();
    const erc20events = deployReceipt.events?.filter(ev => ev.event === 'ERC20DeployedEvent');
    assert(erc20events.length == 1);
    return erc20events[0].args?._tokenContract;
}