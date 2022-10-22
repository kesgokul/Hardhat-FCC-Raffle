//what is this contract going to do?
// users enter the raffle by paying the required amount of ETH
// pick a random winner at a regular interval -> fully automated

//SPDX-License-Identifier: MIT

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/AutomationCompatible.sol";

pragma solidity ^0.8.7;

error Raffle__NotEnoughEthSent();
error Raffle__TransferFailed();
error Raffle__RaffleClosed();
error Raffle__UpKeepNotNeeded();

/**
 * @title A simple raffle contract
 * @author Gokul
 * @dev This contract used ChainLink DON for randomness and automation(Keepers).
 */

contract Raffle is VRFConsumerBaseV2, AutomationCompatibleInterface {
    enum RaffleState {
        OPEN,
        CALCULATING
    }

    /* State variables */
    uint256 private immutable i_entranceFee;
    address payable[] private s_players;
    VRFCoordinatorV2Interface private immutable i_VRFCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;
    RaffleState private s_raffleState;
    uint256 private immutable i_interval;
    uint256 private s_lastTimestamp;

    // Lottery variables
    address private s_recentWinner;

    event RaffleEnter(address indexed player);
    event RequestedRaffleWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed recentWinner);

    constructor(
        uint256 _interval,
        uint32 _callbackGasLimit,
        uint64 _subscriptionId,
        bytes32 _gasLane,
        address VRFCoordinatorAddress, // contract address
        uint256 _entranceFee
    ) VRFConsumerBaseV2(VRFCoordinatorAddress) {
        i_entranceFee = _entranceFee;
        i_VRFCoordinator = VRFCoordinatorV2Interface(VRFCoordinatorAddress);
        i_gasLane = _gasLane;
        i_subscriptionId = _subscriptionId;
        i_callbackGasLimit = _callbackGasLimit;
        i_interval = _interval;

        s_raffleState = RaffleState.OPEN;
        s_lastTimestamp = block.timestamp;
    }

    function enterRaffle() public payable {
        // checking the amount sent and the raffle state
        if (msg.value < i_entranceFee) {
            revert Raffle__NotEnoughEthSent();
        }

        if (s_raffleState != RaffleState.OPEN) {
            revert Raffle__RaffleClosed();
        }
        s_players.push(payable(msg.sender));
        emit RaffleEnter(msg.sender);
    }

    /**
     * @dev This function uses the ChainLink Automation to trigger ChainLinkVRF to pick a random winner.
     * When can upKeepNeed return true
     * 1. Time has passed the interval
     * 2. contract has enough balance
     * 3. raffle state has to be open since this should not be called while already fetching a random number
     * 4. Players is not empty
     *  */
    function checkUpkeep(
        bytes memory /*checkData*/
    )
        public
        view
        override
        returns (
            bool upkeepNeeded,
            bytes memory /*performData*/
        )
    {
        bool hasTimePassed = (block.timestamp - s_lastTimestamp) > i_interval;
        bool isOpen = (s_raffleState == RaffleState.OPEN);
        bool hasBalance = address(this).balance > 0;
        bool hasPlayers = s_players.length > 0;

        upkeepNeeded = (hasTimePassed && isOpen && hasBalance && hasPlayers);
    }

    // Getting randon number using chainLink VRF
    /**
     * @dev this Function is triggered when checkUpKeep returns true.
     * It calls the ChainLinkVRF contract to get a random number.
     */
    function performUpkeep(
        bytes memory /*performData*/
    ) external {
        (bool upKeepNeeded, ) = checkUpkeep("");
        if (!upKeepNeeded) {
            revert Raffle__UpKeepNotNeeded();
        }

        //change the raffle state to calculating
        s_raffleState = RaffleState.CALCULATING;
        uint256 requestId = i_VRFCoordinator.requestRandomWords(
            i_gasLane, // gasLane
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );

        emit RequestedRaffleWinner(requestId);
    }

    // Receiving the random numbers and picking the winner
    function fulfillRandomWords(
        uint256, /*requestId*/
        uint256[] memory randomWords
    ) internal virtual override {
        uint256 raffleWinnerIndex = randomWords[0] % s_players.length;
        address payable raffleWinner = s_players[raffleWinnerIndex];
        s_recentWinner = raffleWinner;

        //reset players, raffleState and timestamp
        s_players = new address payable[](0);
        s_raffleState = RaffleState.OPEN;
        s_lastTimestamp = block.timestamp;

        emit WinnerPicked(raffleWinner);
    }

    // view and pure functions
    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getLastTimeStamp() public view returns (uint256) {
        return s_lastTimestamp;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }

    function getRaffleState() public view returns (RaffleState) {
        return s_raffleState;
    }

    function getNumPlayers() public view returns (uint256) {
        return s_players.length;
    }

    // This can be a pure function since NUM_WORDS is
    // a contrant and it's stored in the byte code. No read from the contract
    function getNumWords() public pure returns (uint32) {
        return NUM_WORDS;
    }
}
