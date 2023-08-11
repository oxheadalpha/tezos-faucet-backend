declare global {
  namespace NodeJS {
    interface ProcessEnv {
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
      DISABLE_CHALLENGES: string
    }
  }
}

export {}
