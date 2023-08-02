declare global {
  namespace NodeJS {
    interface ProcessEnv {
      FAUCET_PRIVATE_KEY: string
      FAUCET_ADDRESS: string
      ENABLE_CAPTCHA: string
      FAUCET_CAPTCHA_SECRET: string
      AUTHORIZED_HOST: string
      API_PORT: string
      RPC_URL: string
      FAUCET_AMOUNT_USER: string
      FAUCET_AMOUNT_BAKER: string
      MAX_BALANCE: string
    }
  }
}

export {}
