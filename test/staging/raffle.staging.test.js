const { deployments, network, ethers, getNamedAccounts } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../../helper-hardhat-config");
const { assert, expect } = require("chai");

developmentChains.includes(network.name)
  ? describe.skip
  : describe("raffle staging test", function () {
      let raffle, deployer, raffleEntranceFee;
      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        raffle = await ethers.getContract("Raffle", deployer);
        raffleEntranceFee = await raffle.getEntranceFee();
      });

      describe("fulfillRandomWords", function () {
        it("Picks a winner, resets lottery and sends money to the winner", async function () {
          const startingTimestamp = await raffle.getLastTimestamp();
          const accounts = await ethers.getSigners();
          const startingWinenerBalance = await accounts[0].getBalance();

          await new Promise(async (resolve, reject) => {
            //listener for the winnerPicked event
            raffle.once("WinnerPicked", async function () {
              console.log("winner picked");
              try {
                const latestTimeStamp = await raffle.getLastTimestamp();
                const winner = await raffle.getRecentWinner();
                const endingWinnerBalance = await accounts[0].getBalance();
                //assertion
                assert.equal(
                  startingWinenerBalance.toString(),
                  endingWinnerBalance.add(raffleEntranceFee).toString()
                );
                assert(latestTimeStamp > startingTimestamp);
                assert.equal(winner, deployer.address);
                await expect(raffle.getPlayers(0)).to.be.reverted; //players array is reset
                resolve();
              } catch (e) {
                reject(e);
              }
            });
            // setup to fire the even i.e enter the raffle
            const tx = await raffle.enterRaffle({ value: raffleEntranceFee });
            const txReceipt = await tx.wait(1);
            console.log("waiting for winner to be picked");
          });
        });
      });
    });
