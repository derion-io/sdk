# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Test Commands

```bash
# Build TypeScript
npm run build

# Run all tests (with RPC recording for deterministic replay)
npm test

# Run a single test
npm test -- --testNamePattern="<test name>"
# Example: npm test -- --testNamePattern="native-open"

# Format code
npm run pretty

# Run tests with tracing (for debugging RPC calls)
npm run trace
```

Tests use Jest with `ts-jest`. The test suite uses an interceptor to record/replay RPC responses for deterministic testing.

## Architecture Overview

This SDK provides TypeScript utilities for interacting with Derion, a DeFi protocol for leveraged perpetual positions on EVM chains.

### Core Components

**DerionSDK** (`src/sdk.ts`) - Main entry point. Stateless orchestrator that creates other components:
- Loads chain-specific configs from `https://github.com/derion-io/configs`
- Creates Account, StateLoader, and Swapper instances

**Profile** (`src/profile.ts`) - Holds chain configuration loaded from remote configs repo. Provides ABIs and network-specific settings.

**StateLoader** (`src/stateLoader.ts`) - Fetches on-chain pool state using ethereum-multicall. Uses state overrides to inject custom View contract bytecode for computing pool metrics.

**Account** (`src/account.ts`) - Tracks an account's positions and transitions by processing transaction logs. Maintains:
- `positions`: Map of position ID to Position data
- `transitions`: History of position changes
- `balances`/`allowances`: Token balances and approvals

**Swapper** (`src/swapper.ts`) - Handles swap execution and simulation. Supports:
- Native token / ERC20 / Position token swaps
- Paraswap aggregator integration for arbitrary token routes
- Uses Universal Transaction Router (UTR) for complex multi-step swaps

### Key Data Types (`src/type/index.ts`)

- **Pool**: Contains `config` (immutable params), `metadata` (token info), `state` (R, a, b reserves), `view` (computed values)
- **Position**: Entry data including balance, priceR, price, rPerBalance, maturity
- **Transition**: Records of position changes with net transfers

### Position ID Format

Positions are identified by a 32-byte packed ID: `side (12 bytes) + poolAddress (20 bytes)`. Utility functions in `src/utils/index.ts`:
- `packPosId(address, side)`: Creates position ID
- `unpackPosId(id)`: Returns `[poolAddress, side]`
- `isPosId(address)`: Checks if string is a position ID (66 chars)

### Pool Sides

- `POOL_IDS.A` (1): Long position
- `POOL_IDS.B` (2): Short position
- `POOL_IDS.C` (3): LP position
- `POOL_IDS.R` (4): Reserve token
- `POOL_IDS.native` (5): Native token

### Typical Flow

1. Initialize SDK with chainId, call `sdk.init()`
2. Import pools via `sdk.importPools(pools, addresses)`
3. Load pool state via `stateLoader.update({ pools })`
4. Create account, process logs via `account.processLogs(txLogs)`
5. Calculate position views via `sdk.calcPositionState(position, pools)`
6. Execute swaps via `swapper.simulate()` or `swapper.swap()`

## Related Repository: Contracts (`../core`)

The Solidity smart contracts this SDK interacts with are located in `../core`. Key contracts:

- **Token.sol** - ERC-1155 token contract shared by all pools (with maturity extension and ERC-20 shadow tokens)
- **PoolLogic.sol** - Core swap logic with asymptotic power curve pricing, interest/premium decay
- **PoolFactory.sol** - Factory deploying pools as MetaProxy clones (ERC-3448)
- **Helper.sol** - Swap orchestration contract used by Swapper
- **View.sol** - Read-only contract for computing pool metrics (bytecode injected via state override)
- **Fetcher.sol** - Uniswap V3 oracle integration for TWAP/SPOT prices

Contract commands (run from `../core`):
```bash
hardhat compile      # Compile contracts
hardhat test         # Run contract tests
hardhat test test/<file>.test.js  # Run specific test
```

Pool state variables map to SDK types:
- Contract `s_a`, `s_b` coefficients → SDK `pool.state.a`, `pool.state.b`
- Contract SIDE_A/B/C (0x10/0x20/0x30) → SDK POOL_IDS.A/B/C (1/2/3)
- Contract uses Q128 fixed-point → SDK uses BigNumber with same precision
