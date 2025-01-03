# Derion SDK

## Sample Usage
```js
const sdk = new DerionSDK({ chainId })
await sdk.init()

let txLogs: LogType[][] = []
if ("we have account logs from some indexer or etherscan") {
    txLogs = groupBy(logs, log => log.transactionHash)
} else if ("we have receipts from some indexer") {
    txLogs = receipts.map(r => r.logs)
}
const pools: Pools = {}

const knownPoolAddresses = [...]
sdk.importPools(pools, knownPoolAddresses)

const { poolAddresses } = sdk.extractLogs(txLogs)
sdk.importPools(pools, poolAddresses)

const stateLoader = sdk.getStateLoader(rpcUrl)
await stateLoader.update({ pools })

const account = sdk.createAccount(accountAddress)
// build the historical data (incrementally)
// Notes: does this for every new logs acchieved
account.processLogs(txLogs)
account.processLogs(txLogs) // the second call does nothing as those logs are already processed

// account transaction history can be build from account.transistions
const txHistory = account.transistions

const posViews = Object.values(account.positions).map(pos => sdk.calcPositionState(pos, pools))
console.log(...posViews.map(pv => formatPositionView(pv)))

// update pools and positions state and balance
// Note: does this as often as we can afford
await stateLoader.update({ pools, accounts })

const poolAddress = 'pool address to interact with'
const NATIVE_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

const swapper = sdk.createSwapper(rpcUrl)
const { amountOuts, gasUsed } = await swapper.simulate({
    tokenIn: NATIVE_ADDRESS',
    tokenOut: packPosId(poolAddress, POOL_IDS.A),
    amount: numberToWei(0.0001, 18),
    deps: {
        signer,
        pools,
    }
})

console.log('amountOut', amountOuts[amountOuts.length-1].toString())

const tx = await swapper.swap({
    tokenIn: NATIVE_ADDRESS',
    tokenOut: packPosId(poolAddress, POOL_IDS.A),
    amount: numberToWei(0.0001, 18),
    deps: {
        signer,
        pools,
    }
})
```

## Public Configs
Public configuration for Derion is loaded from `https://github.com/derion-io/configs`

## SDK Objects

### SDK

Hold the public configs and its component, no state nor historical data is stored in this object.

The SDK object is used to created and load other types of object below.

```js
sdk = new DerionSdk({ chainId: 42161 })
await sdk.init()
```

### StateLoader

Povides the logic for on-chain data loading, usually for multiple data at a time using `ethereum-multicall`.

```js
stateLoader = sdk.getStateLoader({ rpcURL })
```

### Pool

```js
const pools: Pools = {}
```

Represents each Derion pool, can be created using creation log (with no event signature) from PoolDeployer with:
   * topic0: baseToken address
   * topic1: baseToken symbol
   * topic2: search keyword 1
   * topic3: search keyword 2
   * data: pool configs followed by pool address
   * e.g. https://polygonscan.com/tx/0x6ccfc6af4b472e3d64ee82ca9b4dec6a671b41107fae772206a24e50fc55bdc7#eventlog#70

```js
sdk.importPoolLog(pools, log)
```

Alternatively, pool can be created by loading from the chain state by passing pool addresses to `StateLoader`:

```js
const pools: Pools = {}
sdk.importPools(pools, [addressB, addressC])
```

Current state of pool is loadded using StateLoader:

```js
stateLoader.update({ pools, accounts }) // mass update state for multiple pools
```

### Account

Represents an account with an address to call and send transaction.

```js
account = sdk.createAccount(address | Signer)
```

## Position Historical Data

Position entry data and transitions are historical data of an unique position (a Derion token in an account). They require event logs to construct, these logs can be obtained by 3rd-party indexer (e.g. etherscan) or in-house indexing service. Without these logs, client can only have knownledge about the current state of a position, not the entry and transistion data.

```js
account.processLogs(txLogs: LogType[][])
```

The results are stored (and updated) in `account.entries` and `account.transistions`.

`txLogs` is a 2 dimentional array logs grouped by `transactionHash` of the following events:
* Pool.Position
* Helper.Swap
* Token.TransferSingle
* Token.TransferBatch
* ERC20.Transfer

```js
txLogs = [
    [log, log, log, ...], // all related logs of the same tx
    [log, log, ...],
    [log, log, ...],
    ...
]
```

## Position

After calling `account.processLogs`, account `positions` and `transistions` are stored in the `account` object itself. To calculate the current postion view use:

```js
calcPositionState = (
    position: Position,
    pools: Pools,
    currentPriceR?: BigNumber,  // current price of the reserve token in x128 format
    balance?: BigNumber,        // projected balance of the position  
): PositionView
```

## Swapper

```js
const swapper = sdk.createSwapper(rpcUrl)
const { amountOuts, gasUsed } = swapper.simulate({
    tokenIn,    // input token or positionId
    tokenOut,   // output token or positionId
    amount,     // amount input
    deps: {
        signer,
        pools,
    }
})
const tx = await swapper.swap(...)
```
