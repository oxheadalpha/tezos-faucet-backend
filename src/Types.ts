import { Profile } from "./profiles"

export type RequestBody = {
  captchaToken: string
  address: string
  profile: Profile
}

export type ResponseBody = {
  status: string
  txHash?: string
  message?: string
}

export type ProfileInfo = {
  profile: Profile
  amount: number
  currency: string
}

export type InfoResponseBody = {
  faucetAddress: string
  captchaEnabled: boolean
  profiles: Record<Profile, ProfileInfo>
  maxBalance: number
}
