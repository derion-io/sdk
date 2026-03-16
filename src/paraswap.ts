import { PARA_DATA_BASE_URL, PARA_BUILD_TX_BASE_URL, PARA_VERSION } from './utils/constant'

export class ParaswapClient {
  private baseURL: string
  private buildTxURL: string
  private version: string
  private chainId: number

  constructor(
    chainId: number,
    baseURL = PARA_DATA_BASE_URL,
    buildTxURL = PARA_BUILD_TX_BASE_URL,
    version = PARA_VERSION,
  ) {
    this.chainId = chainId
    this.baseURL = baseURL
    this.buildTxURL = buildTxURL
    this.version = version
  }

  async getRate(params: {
    srcToken: string
    srcDecimals?: number
    destToken: string
    destDecimals?: number
    srcAmount?: string
    destAmount?: string
    side: string
    partner: string
    excludeDirectContractMethods?: boolean
    otherExchangePrices?: boolean
  }, userAddress: string): Promise<any> {
    const amount = params.srcAmount || params.destAmount
    const url = `${this.baseURL}/?version=${this.version}` +
      `&srcToken=${params.srcToken}` +
      `&srcDecimals=${params.srcDecimals || 18}` +
      `&destToken=${params.destToken}` +
      `&destDecimals=${params.destDecimals || 18}` +
      `&amount=${amount}` +
      `&side=${params.side}` +
      `&excludeDirectContractMethods=${params.excludeDirectContractMethods || false}` +
      `&otherExchangePrices=${params.otherExchangePrices || true}` +
      `&partner=${params.partner}` +
      `&network=${this.chainId}` +
      `&userAddress=${userAddress}`

    const rateData = await (await fetch(url, { method: 'GET', redirect: 'follow' })).json()
    return rateData
  }

  async buildTx(params: {
    srcToken: string
    srcDecimals?: number
    destToken: string
    destDecimals?: number
    srcAmount?: string
    destAmount?: string
    side: string
    partner: string
    ignoreGasEstimate?: boolean
    ignoreAllowance?: boolean
  }, rateData: any, slippage?: number): Promise<any> {
    const url = `${this.buildTxURL}/${this.chainId}` +
      `?ignoreGasEstimate=${params.ignoreGasEstimate || true}` +
      `&ignoreAllowance=${params.ignoreAllowance || true}` +
      `&gasPrice=${rateData.priceRoute.gasCost}`

    const swapData = await (await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        slippage: slippage || 500,
        partner: params.partner,
        priceRoute: rateData.priceRoute,
      }),
    })).json()
    return swapData
  }
}
