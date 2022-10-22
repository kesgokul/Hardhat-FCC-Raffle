# Automated Raffle system Hardhat

<sub>On going project</sub>

<sub>Disclaimer: This project is being built as a part of the Blockchain, Solidity and Hardhat course by FreeCodeCamp for learning purposes</sub>

## Overview:

This project aims to build a full stack application that will allow users to enter an automated lottery system by paying an entrance fee. The winner is randomnly picked at a regular interval and total funds (entrance fee) collected is transfered to the winner as the Prize.

## Tech used:

1. `Hardhat` for setting up the development enviroment.
2. `harhat-deploy` plugin to make deploying scripts and contracts less cumbersome as it keeps track of all deployed contracts.
3. `@nomicfoundation/hardhat-toolbox` plugin to avail various tools such as the `gas-reporter` for gas expenditure detalis, `coverage` for analysing testing coveragea and other tools like `Chai`, `ethereum-waffle` that aid in writing tests.
4. `@chainlink/contracts` `VRFCoordinatorV2` for randomness from the ChainLink DON.
5. `@chainlink/contracts` `AutomationCompatible` for automatically trigger the smart contract to pick a random winner.

## Learnings:

1. **Custom Errors** using custom error codes instead of conventional require statements as custom errors are more gas effecient.
2. **Constants, immutable** using `constant` and `immutable` for variable that do not change throughout the contract - for gas effeciency.
3. **Enum** data structures to maintain state.
4. **Event** using events to leverage the logging data structure of EVM to read/listen for events especially from the front end.
5. Using `private` variables and creating corresponding getter functions instead of `public` variables - for gas effeciency.
