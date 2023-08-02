declare global {
  namespace NodeJS {
    interface ProcessEnv {
      API_PORT: string
      AUTHORIZED_HOST: string
      ENABLE_CAPTCHA: string
      FAUCET_ADDRESS: string
      FAUCET_AMOUNT_BAKER: string
      FAUCET_AMOUNT_USER: string
      FAUCET_CAPTCHA_SECRET: string
      FAUCET_PRIVATE_KEY: string
      MAX_BALANCE: string
      REDIS_PASSWORD: string
      REDIS_URL: string
      RPC_URL: string
    }
  }
}

export {}
