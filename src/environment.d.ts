declare global {
    namespace NodeJS {
        interface ProcessEnv {
            FAUCET_PRIVATE_KEY: string;
            FAUCET_ADDRESS: string;
            ENABLE_CAPTCHA: string;
            FAUCET_CAPTCHA_SECRET: string;
            AUTHORIZED_HOST: string;
            API_PORT: number;
            RPC_URL: string;
            FAUCET_AMOUNT_USER: number;
            FAUCET_AMOUNT_BAKER: number;
            MAX_BALANCE: number;
        }
    }
}

export { }