const { network, ethers } = require("hardhat");

const BASE_FEE = ethers.utils.parseEther("0.25"); //premium of 0.25Link per VRF call
const GAS_PRICE_LINK = 1e5; //100000

/**
 * @dev Deploying the VRFCoordinatorV2Mock contract here in the case of
 * a development network.
 */

async function deployfunc({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;
  if (chainId == 31337) {
    log("Local network detected, deploying mocks");
    await deploy("VRFCoordinatorV2Mock", {
      contract: "VRFCoordinatorV2Mock",
      from: deployer,
      args: [BASE_FEE, GAS_PRICE_LINK],
      log: true,
    });
  }
  log("Mocks deployed..!!");
  log("---------------------------------------------------");
}

module.exports = deployfunc;
module.exports.tags = ["all", "VRFmock"];
