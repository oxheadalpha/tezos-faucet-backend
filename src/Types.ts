enum Profile {
    USER = "USER",
    BAKER = "BAKER"
}

type RequestBody = {
    captchaToken: string;
    address: string;
    profile: string;
}

type ResponseBody = {
    status: string;
    txHash: string | undefined;
    message: string | undefined;
}

type InfoResponseBody = {
    faucetAddress: string;
    captchaEnable: boolean;
    profiles: ProfileInfo;
    maxBalance: number;
}

type ProfileInfo = {
    profile: string;
    amount: number;
    currency: string;
}

export { Profile, RequestBody, ResponseBody, InfoResponseBody, ProfileInfo };