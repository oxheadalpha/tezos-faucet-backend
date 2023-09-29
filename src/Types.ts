export type RequestBody = {
  captchaToken: string
  address: string
}

export type ResponseBody = {
  status: string
  txHash?: string
  message?: string
}

export type InfoResponseBody = {
  faucetAddress: string
  captchaEnabled: boolean
  challengesEnabled: boolean
  maxBalance: number
  minTez: number,
  maxTez: number
}
