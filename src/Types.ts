export enum Profile {
  USER = "USER",
  BAKER = "BAKER",
}

export type RequestBody = {
  captchaToken: string
  address: string
  profile: string
}

export type ResponseBody = {
  status: string
  txHash?: string
  message?: string
}

export type ProfileInfo = {
  profile: string
  amount: number
  currency: string
}

export type InfoResponseBody = {
  faucetAddress: string
  captchaEnabled: boolean
  profiles: ProfileInfo
  maxBalance: number
}
