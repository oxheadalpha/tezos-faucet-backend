import { Profile } from "./Types"

export type ProfileEnvVars<Profile extends string> = {
  [K in
    | `${Profile}_PROFILE_AMOUNT`
    | `${Profile}_PROFILE_CAPTCHA_DIFFICULTY`
    | `${Profile}_PROFILE_DIFFICULTY`
    | `${Profile}_PROFILE_CAPTCHA_CHALLENGES_NEEDED`
    | `${Profile}_PROFILE_CHALLENGES_NEEDED`]: string
}

declare global {
  namespace NodeJS {
    interface ProcessEnv extends ProfileEnvVars<Profile> {
      API_PORT: string
      AUTHORIZED_HOST: string
      DISABLE_CHALLENGES: string
      ENABLE_CAPTCHA: string
      FAUCET_ADDRESS: string
      BAKER_PROFILE_AMOUNT: string
      USER_PROFILE_AMOUNT: string
      CAPTCHA_SECRET: string
      FAUCET_PRIVATE_KEY: string
      MAX_BALANCE: string
      REDIS_PASSWORD: string
      REDIS_URL: string
      RPC_URL: string
    }
  }
}

export {}
