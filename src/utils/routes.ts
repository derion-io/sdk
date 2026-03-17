import { BigNumber, utils } from 'ethers'
import { bn } from '.'

export type SingleRouteToUSDResult = {
  quoteTokenIndex: number
  stablecoin: string
  address: string
}

export function getSingleRouteToUSD(
  profile: { routes: { [key: string]: { type: string; address: string }[] }; configs: { stablecoins: string[] } },
  token: string,
  types: Array<string> = ['uniswap3'],
): SingleRouteToUSDResult | undefined {
  const {
    routes,
    configs: { stablecoins },
  } = profile
  for (const stablecoin of stablecoins) {
    for (const asSecond of [false, true]) {
      const key = asSecond ? `${stablecoin}-${token}` : `${token}-${stablecoin}`
      const route = routes[key]
      if (route?.length != 1) {
        continue
      }
      const { type, address } = route[0]
      if (!types.includes(type)) {
        continue
      }
      const quoteTokenIndex = token.localeCompare(stablecoin, undefined, { sensitivity: 'accent' }) < 0 ? 1 : 0
      return {
        quoteTokenIndex,
        stablecoin,
        address,
      }
    }
  }
  return undefined
}

export function getIndexR(
  profile: { routes: { [key: string]: { type: string; address: string }[] }; configs: { stablecoins: string[] } },
  tokenR: string,
): BigNumber {
  const { quoteTokenIndex, address } = getSingleRouteToUSD(profile, tokenR) ?? {}
  if (!address) {
    return bn(0)
  }
  return bn(utils.hexZeroPad(bn(quoteTokenIndex).shl(255).add(address).toHexString(), 32))
}
