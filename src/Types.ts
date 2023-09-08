export type RequestBody = {
  captchaToken: string
  address: string
}

export type ResponseBody = {
  status: string
  txHash?: string
  message?: string
}

export type ProfileInfo = {
  amount: number
  currency: string
}

export type InfoResponseBody = {
  faucetAddress: string
  captchaEnabled: boolean
  challengesEnabled: boolean
  maxBalance: number
}
