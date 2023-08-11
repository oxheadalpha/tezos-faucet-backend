export const USER = "USER"
export const BAKER = "BAKER"
export type Profile = typeof USER | typeof BAKER
export const Profiles: Record<string, Profile> = { USER, BAKER }

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
