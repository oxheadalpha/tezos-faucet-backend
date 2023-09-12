declare global {
  namespace NodeJS {
    interface ProcessEnv {
      API_PORT: string
      AUTHORIZED_HOST: string
      CAPTCHA_SECRET: string
      ENABLE_CAPTCHA: string
      DISABLE_CHALLENGES: string
      FAUCET_PRIVATE_KEY: string
      MAX_BALANCE: string
      REDIS_PASSWORD: string
      REDIS_URL: string
      RPC_URL: string
      MIN_TEZ: string
      MAX_TEZ: string
      MIN_CHALLENGES: string
      MAX_CHALLENGES: string
      CHALLENGE_SIZE: string
      DIFFICULTY: string
      CAPTCHA_CHALLENGES_REDUCTION_RATIO: string
    }
  }
}

export {}
