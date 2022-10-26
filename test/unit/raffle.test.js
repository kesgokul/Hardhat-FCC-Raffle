const { deployments, network, ethers, getNamedAccounts } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../../helper-hardhat-config");
const { assert, expect } = require("chai");

const ENTEANCE_FEE = ethers.utils.parseEther("0.1");

describe("Raffle", function () {
  let raffle, VRFCoordinatorV2Mock, deployer;
  let interval, raffleEntranceFee;
  const chainId = network.config.chainId;
  beforeEach(async function () {
    deployer = (await getNamedAccounts()).deployer;
    await deployments.fixture(["all"]);
    raffle = await ethers.getContract("Raffle", deployer);
    VRFCoordinatorV2Mock = await ethers.getContract(
      "VRFCoordinatorV2Mock",
      deployer
    );

    //raffle variables
    interval = await raffle.getInterval();
    raffleEntranceFee = await raffle.getEntranceFee();
  });
  describe("Constructor", function () {
    it("Initializes raffle with correct raffle state, entrance fee & interval", async function () {
      const raffleState = await raffle.getRaffleState();
      console.log("constructor");
      assert.equal(raffleState.toString(), "0");
      assert.equal(
        raffleEntranceFee.toString(),
        networkConfig[chainId]["entranceFee"]
      );
      assert.equal(interval.toString(), networkConfig[chainId]["interval"]);
    });
  });

  describe("Enter raffle", function () {
    it("Reverts if incorrect entrance fee", async function () {
      await expect(raffle.enterRaffle()).to.be.reverted;
    });

    it("emits RaffleEnter with deployer address indexed", async function () {
      const transactionResponse = await raffle.enterRaffle({
        value: ENTEANCE_FEE,
      });
      const transactionReceipt = await transactionResponse.wait(1);
      assert.equal(transactionReceipt.events[0].args["player"], deployer);
    });

    it("adds the deployer to the players list", async function () {
      await raffle.enterRaffle({ value: ENTEANCE_FEE });
      const playerEntered = await raffle.getPlayer(0);
      assert.equal(playerEntered, deployer);
    });

    it("reverts when the raffle state is calculating", async function () {
      await raffle.enterRaffle({ value: ENTEANCE_FEE });
      await network.provider.send("evm_increaseTime", [
        interval.toNumber() + 1,
      ]);
      await network.provider.send("evm_mine", []);

      // call perfomUpKeep pretending to chainlink automation
      await raffle.performUpkeep([]);
      await expect(raffle.enterRaffle({ value: ENTEANCE_FEE })).to.be.reverted;
    });
  });

  describe("checkUpkeep", function () {
    it("returns false if nobody entered the raffle", async function () {
      await network.provider.send("evm_increaseTime", [
        interval.toNumber() + 1,
      ]);
      await network.provider.send("evm_mine", []);
      const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
      assert(!upkeepNeeded);
    });

    it("returns false if enough time has not passed", async function () {
      await raffle.enterRaffle({ value: ENTEANCE_FEE });
      const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
      assert(!upkeepNeeded);
    });

    it("returns false if raffle state is not open", async function () {
      await raffle.enterRaffle({ value: ENTEANCE_FEE });
      await network.provider.send("evm_increaseTime", [
        interval.toNumber() + 1,
      ]);
      await network.provider.send("evm_mine", []);
      await raffle.performUpkeep([]);
      const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
      assert(!upkeepNeeded);
    });

    it("returns true if raffle has players, has balance, state is open and time has passed", async function () {
      await raffle.enterRaffle({ value: ENTEANCE_FEE });
      await network.provider.send("evm_increaseTime", [
        interval.toNumber() + 1,
      ]);
      await network.provider.send("evm_mine", []);

      const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
      assert(upkeepNeeded);
    });
  });

  describe("performUpkeep", function () {
    it("only called when checkUpkeep is true", async function () {
      await raffle.enterRaffle({ value: ENTEANCE_FEE });
      await network.provider.send("evm_increaseTime", [
        interval.toNumber() + 1,
      ]);
      await network.provider.send("evm_mine", []);
      const tx = await raffle.performUpkeep([]);
      assert(tx);
    });

    it("reverts when checkUpkeep is not true", async function () {
      expect(await raffle.performUpkeep).to.be.revertedWith(
        "Raffle__UpKeepNotNeeded()"
      );
    });

    it("changes raffle state to calculating", async function () {
      await raffle.enterRaffle({ value: ENTEANCE_FEE });
      await network.provider.send("evm_increaseTime", [
        interval.toNumber() + 1,
      ]);
      await network.provider.send("evm_mine", []);
      await raffle.performUpkeep([]);

      const raffleState = await raffle.getRaffleState();
      assert.equal(raffleState.toString(), "1");
    });

    it("calls the VRFCoordinator to request random number", async function () {
      await raffle.enterRaffle({ value: ENTEANCE_FEE });
      await network.provider.send("evm_increaseTime", [
        interval.toNumber() + 1,
      ]);
      await network.provider.send("evm_mine", []);
      const transactionResponse = await raffle.performUpkeep([]);
      const transactionReceipt = await transactionResponse.wait(1);

      // request id from the event emitted by the VRFCoordinator contract, not raffle.
      const requestId = transactionReceipt.events[1].args.requestId;
      assert(requestId.toNumber() > 0);
    });
  });

  describe("fulfillRandomWords", function () {
    beforeEach(async function () {
      await raffle.enterRaffle({ value: ENTEANCE_FEE });
      await network.provider.send("evm_increaseTime", [
        interval.toNumber() + 1,
      ]);
      await network.provider.send("evm_mine", []);
    });

    it("Only called after performUpkeep is called", async function () {
      await expect(
        VRFCoordinatorV2Mock.fulfillRandomWords(0, deployer)
      ).to.be.revertedWith("nonexistent request");
    });

    it("picks a winner, resets the lottery", async function () {
      const startingAccountsIndex = 1; // 0 is deployer
      const endingAccountsIndex = 4;
      let accounts = await ethers.getSigners();
      accounts = accounts.slice(startingAccountsIndex, endingAccountsIndex);
      accounts.forEach(async (acc) => {
        const connectedRaffle = await raffle.connect(acc);
        await connectedRaffle.enterRaffle({ value: ENTEANCE_FEE });
      });

      const startingTimestamp = await raffle.getLastTimestamp(); //get the timestamp before winnerPicked event

      // listen for the winnerPicked event
      await new Promise(async (resolve, reject) => {
        raffle.once("WinnerPicked", async () => {
          console.log("event found");
          try {
            const recentWinner = await raffle.getRecentWinner();
            const winnerAccount = await accounts.find((acc) => recentWinner);
            const winnerBalance = await winnerAccount.getBalance();

            const raffleState = await raffle.getRaffleState();
            const latestTimestamp = await raffle.getLastTimestamp();
            const numPlayers = await raffle.getNumPlayers();

            console.log(recentWinner, winnerBalance.toString());

            assert.equal(raffleState.toString(), "0");
            assert(latestTimestamp > startingTimestamp);
            assert.equal(numPlayers.toNumber(), 0);
            assert.equal(recentWinner.toString(), winnerAccount.address);
            resolve();
          } catch (e) {
            reject(e);
          }
        });
        // set up the event to be fired
        const tx = await raffle.performUpkeep([]);
        const txReceipt = await tx.wait(1);
        await VRFCoordinatorV2Mock.fulfillRandomWords(
          txReceipt.events[1].args.requestId,
          raffle.address
        );
      });
    });
  });
});
