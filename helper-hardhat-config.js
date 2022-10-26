const { ethers } = require("hardhat");

const networkConfig = {
  5: {
    name: "goerli",
    VRFCoordinatorV2: "	0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
    gasLane:
      "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
    entranceFee: ethers.utils.parseEther("0.01"),
    VRFCoordinatorV2: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
    subscriptionId: "0",
    callbackGasLimit: "500000",
    interval: "30",
  },
  31337: {
    name: "localhost",
    gasLane:
      "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
    entranceFee: ethers.utils.parseEther("0.01"),
    callbackGasLimit: "500000",
    interval: "30",
  },
};

const developmentChains = ["localhost", "hardhat"];

module.exports = { developmentChains, networkConfig };
