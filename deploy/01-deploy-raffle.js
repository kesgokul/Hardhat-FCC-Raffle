const { network, ethers } = require("hardhat");
const { networkConfig } = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

const VRF_FUND_AMOUNT = ethers.utils.parseEther("2");

async function deployFunc({ getNamedAccounts, deployments }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;
  let VRFCoordinatorAddress, SUB_ID;

  /**
   * @dev fetching the VRFCoordinatorV2 (Mock or the testnet contract address)
   * Testnet - subscription creation and funding will be done on the ChainLink VRF website
   * Mock - the contract is called to create a subscription and fund the subscription
   */

  if (chainId == 31337) {
    // development chain(localhost)
    const VRFCoordinatorV2Mock = await ethers.getContract(
      "VRFCoordinatorV2Mock"
    );
    VRFCoordinatorAddress = VRFCoordinatorV2Mock.address;
    const transactionResponse = await VRFCoordinatorV2Mock.createSubscription();
    const transactionResceipt = await transactionResponse.wait(1);
    const subId = transactionResceipt.event[0].args.subId;
    SUB_ID = subId;
    await VRFCoordinatorV2Mock.fundSubscription(subId, VRF_FUND_AMOUNT);
  } else {
    // testnet
    VRFCoordinatorAddress = networkConfig[chainId]["VRFCoordinatorV2"];
    SUB_ID = networkConfig[chainId]["subscriptionId"];
  }

  // configuring constructor arguments for Raffle.sol
  const GAS_LANE = networkConfig[chainId]["gasLane"];
  const ENTRANCE_FEE = networkConfig[chainId]["entranceFee"];
  const CALLBACK_GAS_LIMIT = networkConfig[chainId]["callbackGasLimit"];
  const INTERVAL = networkConfig[chainId]["interval"];

  const args = [
    _interval,
    _callbackGasLimit,
    SUB_ID,
    GAS_LANE,
    VRFCoordinatorAddress,
    ENTRANCE_FEE,
  ];

  // Deploying the Raffle contract
  const raffle = await deploy("Raffle", {
    contract: "Raffle",
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: 6,
  });

  if (chainId != 31337) {
    log("Verifying...");
    await verify(raffle.address, args);
    log("------------------------------------------");
  }
}

module.exports = deployFunc;
module.exports.tags = ["all", "raffle"];

//args
// uint256 _interval,
//         uint32 _callbackGasLimit,
//         uint64 _subscriptionId,
//         bytes32 _gasLane,
//         address VRFCoordinatorAddress, // contract address
//         uint256 _entranceFee
