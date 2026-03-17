# Derion SDK

TypeScript SDK for the Derion protocol — leveraged perpetual positions on EVM chains.

Designed for both **1st-party** (protocol frontend/backend) and **3rd-party** (external integrators) use. The SDK handles all calculation and state construction while remaining **stateless** — it holds only chain configuration. All state (pools, positions, balances) is owned and managed by the caller.

## Setup

```bash
# Clone with submodules
git clone --recurse-submodules <repo-url>

# Install dependencies
npm install

# Build
npm run build

# Test
npm test
```

## Quick Start

```ts
import {
  DerionSDK, packPosId, formatPositionView,
  NATIVE_ADDRESS, POOL_IDS,
  type LogType, type Pools,
} from 'derion-sdk'
import { numberToWei } from 'derion-sdk/dist/utils/helper'

// 1. Initialize (loads chain config)
const sdk = new DerionSDK({ chainId: 42161 })
await sdk.init()

// 2. Build pool state (caller owns this data)
let pools: Pools = {}
pools = sdk.importPools(pools, ['0xPool1...', '0xPool2...'])

const stateLoader = sdk.getStateLoader(rpcUrl)
pools = await stateLoader.update({ pools })

// 3. Build account state from historical logs
const account = sdk.createAccount(accountAddress)
await account.processLogs(txLogs, pools)

// 4. Calculate position views
const posViews = Object.values(account.positions).map(pos =>
  sdk.calcPositionState(pos, pools)
)

// 5. Simulate (no signer needed)
const swapper = sdk.createSwapper(rpcUrl)
const { amountOuts, gasUsed } = await swapper.simulate({
  tokenIn: NATIVE_ADDRESS,
  tokenOut: packPosId(poolAddress, POOL_IDS.A),
  amount: numberToWei(0.0001, 18),
  account: accountAddress,
  deps: { pools },
})

// 6. Execute with slippage protection
const amountOutMin = amountOuts[amountOuts.length - 1].mul(95).div(100) // 5% slippage
const tx = await swapper.swap({
  tokenIn: NATIVE_ADDRESS,
  tokenOut: packPosId(poolAddress, POOL_IDS.A),
  amount: numberToWei(0.0001, 18),
  amountOutMin,
  deps: { signer, pools },
})
```

## Design

### Stateless Architecture

The SDK itself stores no pool state, no positions, no balances. It provides:

- **Configuration** — chain-specific contract addresses, ABIs, routing info (loaded once via `init()`)
- **Computation** — position PnL, leverage, funding rates, deleverage prices
- **State construction** — reads on-chain data and structures it into typed objects
- **Transaction building** — constructs swap/open/close transactions

All mutable state is returned to the caller. Functions like `importPools()` and `stateLoader.update()` return new objects rather than mutating inputs. This makes it safe to use in concurrent or multi-account contexts.

### Integration Patterns

**1st-party** (protocol frontend):
```ts
// Full flow: pool discovery, state loading, account tracking, swap execution
const { poolAddresses } = sdk.extractLogs(txLogs)
pools = sdk.importPools(pools, poolAddresses)
pools = await stateLoader.update({ pools })
const account = sdk.createAccount(address, signer)
await account.processLogs(txLogs, pools)
const tx = await swapper.swap({ tokenIn, tokenOut, amount, amountOutMin, deps: { signer, pools } })
```

**3rd-party** (integrators, aggregators, bots):
```ts
// Direct: know the pools, load state, simulate — no signer needed for quotes
pools = sdk.importPools({}, [knownPoolAddress])
pools = await stateLoader.update({ pools })
const { amountOuts } = await swapper.simulate({
  tokenIn: NATIVE_ADDRESS,
  tokenOut: packPosId(knownPoolAddress, POOL_IDS.A),
  amount: '1000000000000000',
  account: '0x0000000000000000000000000000000000000000',
  deps: { pools },
})
```

## SDK Objects

### DerionSDK

Stateless orchestrator. Holds chain config and creates other components.

```ts
const sdk = new DerionSDK({ chainId: 42161 })
await sdk.init()

// With custom config fetcher (useful for testing or custom environments)
await sdk.init(async (url) => myCustomFetch(url))
```

### StateLoader

Fetches on-chain pool state via multicall with state overrides. Injects View contract bytecode at pool addresses to compute metrics off-chain in a single `eth_call`.

```ts
const stateLoader = sdk.getStateLoader(rpcUrl)
// or inject a provider directly
const stateLoader = sdk.getStateLoader(myProvider)

// Returns new Pools object with state populated (does not mutate input)
pools = await stateLoader.update({ pools })
```

### Pool

Pools are identified by their contract address. A Pool contains:

- `config` — immutable parameters (K, MARK, INTEREST_HL, PREMIUM_HL, OPEN_RATE, R_DT, etc.)
- `metadata` — token info (reserve, base, quote symbols and decimals)
- `state` — current reserves (R, a, b)
- `view` — computed values (supplies sA/sB/sC, reserves rA/rB/rC, twap, spot)

```ts
// importPools returns a new Pools object (does not mutate input)
let pools: Pools = {}
pools = sdk.importPools(pools, [address1, address2])
pools = await stateLoader.update({ pools })
```

### Account

Tracks an account's positions, transitions, balances, and allowances by processing transaction logs. The Account is the one stateful object — it accumulates state across `processLogs` calls.

```ts
const account = sdk.createAccount(address)
// or with a signer for transaction execution
const account = sdk.createAccount(address, signer)

// Process logs incrementally — already-processed logs are skipped
await account.processLogs(txLogs, pools)

account.positions    // { [positionId]: Position }
account.transitions  // Transition[]
account.balances     // { [token]: BigNumber }
account.allowances   // { [spenderToken]: BigNumber }
```

Logs can come from any source — Etherscan API, in-house indexer, or direct RPC `eth_getLogs`. The SDK doesn't fetch logs itself; the caller provides them.

### Swapper

Handles swap simulation and execution via the Universal Transaction Router (UTR). Supports native tokens, ERC20s, and position tokens. Integrates with Paraswap for arbitrary token routes.

```ts
const swapper = sdk.createSwapper(rpcUrl)

// Simulate — no signer needed, returns typed SimulateResult
const { amountOuts, gasUsed } = await swapper.simulate({
  tokenIn,     // address, NATIVE_ADDRESS, or positionId
  tokenOut,    // address, NATIVE_ADDRESS, or positionId
  amount,      // input amount as string
  account,     // optional: account address (defaults to zero address)
  deps: { pools },
})

// Execute — requires signer, supports slippage protection
const tx = await swapper.swap({
  tokenIn, tokenOut, amount,
  amountOutMin,  // slippage protection (default 0 = no protection)
  deps: { signer, pools },
})
```

## Position IDs

Positions are identified by a 32-byte packed ID: `side (12 bytes) + poolAddress (20 bytes)`.

```ts
import { packPosId, unpackPosId, isPosId, POOL_IDS } from 'derion-sdk'

const posId = packPosId(poolAddress, POOL_IDS.A) // 66-char hex string
const [pool, side] = unpackPosId(posId)
isPosId(posId) // true
```

### Pool Sides

| Constant | Value | Meaning |
|----------|-------|---------|
| `POOL_IDS.A` | `0x10` | Long position |
| `POOL_IDS.B` | `0x20` | Short position |
| `POOL_IDS.C` | `0x30` | LP position |
| `POOL_IDS.R` | `0x00` | Reserve token |
| `POOL_IDS.native` | `0x01` | Native token |

## Position Historical Data

Position entry data and transitions require event logs to construct. These logs can be obtained from any indexing source — Etherscan, The Graph, or direct RPC calls. Without logs, only the current on-chain state of a position is available (via StateLoader), not entry prices or transition history.

```ts
await account.processLogs(txLogs, pools)
```

`txLogs` is a 2-dimensional array of logs grouped by `transactionHash`:

```ts
txLogs = [
  [log, log, log, ...], // all related logs of the same tx
  [log, log, ...],
  ...
]
```

Relevant event types: `Pool.Position`, `Helper.Swap`, `Token.TransferSingle`, `Token.TransferBatch`, `ERC20.Transfer`, `ERC20.Approval`.

Results are stored in `account.positions` and `account.transitions`.

## Position View

Calculate the current position view from position entry data and pool state:

```ts
const view = sdk.calcPositionState(
  position,      // Position (from account.positions)
  pools,         // Pools (with loaded state)
  currentPriceR, // optional: current reserve token price in Q128
  balance,       // optional: projected balance
)
// Returns PositionView with:
//   valueR, valueU, netPnL, simPnL, leverage, effectiveLeverage,
//   entryPrice, currentPrice, deleveragePriceA, deleveragePriceB, funding
```

## Public Configs

Chain configuration is loaded from `https://github.com/derion-io/configs`:

- `network.json` — chain params, contract addresses, stablecoins
- `routes.json` — Uniswap V3 routing info
- `pools.json` — whitelisted pool addresses

## Testing

```bash
npm test                                    # run all tests
npm test -- --testNamePattern="<name>"      # run specific test
```

Tests use Jest with `ts-jest`. All components support dependency injection for testability:

- **Profile**: accepts a custom `ConfigFetcher` function
- **StateLoader / Swapper**: accept `JsonRpcProvider` instances
- **Swapper**: accepts a custom `ParaswapClient`
