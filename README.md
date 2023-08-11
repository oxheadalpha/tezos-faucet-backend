# Tezos Faucet Backend

## Overview

The Tezos Faucet Backend (frontend code [here](https://github.com/oxheadalpha/tezos-faucet)) provides a reliable and secure way to distribute Tez to users. Through the implementation of a Proof of Work (PoW) mechanism, combined with CAPTCHA, we ensure users expend computational resources, thereby preventing bots and malicious actors from spamming and draining the faucet.

Here's a general flow of how it works:

1. **Requesting Tez**: A user initiates the process by making a request for tez. The backend responds by sending a challenge to the user.
2. **Solving Challenges**: The user must solve the challenge by finding a correct solution. The complexity of the challenge can vary, and the user doesn't know in advance how many challenges they'll need to solve.
3. **Verification & Receiving Tez**: Once the user submits a solution, the backend verifies it. If the solution is correct but there are more challenges to be solved, the user will be sent another challenge. This repeats until all challenges are solved correctly. Only then is the requested Tez granted to the user.

## Prerequisites

- **Node.js** v18
- **Captcha** (Optional): Create a Google [ReCaptcha](https://www.google.com/recaptcha/about/) project. The public site key will be shared with the frontend. Activate domain verification in ReCAPTCHA parameters to allow only communication from the frontend faucet app.
- **Redis** (Optional): If `DISABLE_CHALLENGES` is not set to `false`, set up a Redis server to store PoW challenge data. It's recommended to use a single-instance Redis setup for the challenge data, as this ensures atomicity and helps in avoiding potential exploits. Given that the challenge data isn't persistent or long-term essential, a single instance suffices and is easier to maintain.

## Config

Set environment variables or add them to a `.env` file. See `.env.example`.

Mandatory:

- `FAUCET_PRIVATE_KEY`: Faucet's private key to sign transactions
- `FAUCET_ADDRESS`: Public address of the faucet
- `CAPTCHA_SECRET`: faucet ReCAPTCHA secret key (mandatory if `ENABLE_CAPTCHA=true`)
- `RPC_URL`: Tezos node RPC URL to connect to

Per Profile Configurable. Valid profiles are `USER` and `BAKER`:

- `{PROFILE}_PROFILE_AMOUNT`: The amount of Tez to be distributed for the specified profile. Default for `USER`: `1`, for `BAKER`: `6000`.
- `{PROFILE}_PROFILE_CAPTCHA_DIFFICULTY`: The difficulty level of the challenge if a valid CAPTCHA is provided. Default for both `USER` and `BAKER`: `4`.
- `{PROFILE}_PROFILE_DIFFICULTY`: The difficulty level of the challenge if no CAPTCHA is provided. Default for both `USER` and `BAKER`: `5`.
- `{PROFILE}_PROFILE_CAPTCHA_CHALLENGES_NEEDED`: The number of challenges needed if a valid CAPTCHA is provided. Default for both `USER` and `BAKER`: `5`.
- `{PROFILE}_PROFILE_CHALLENGES_NEEDED`: The number of challenges needed if no CAPTCHA is provided. Default for both `USER` and `BAKER`: `6`.

Optional:

- `ENABLE_CAPTCHA`: `true` to enable ReCAPTCHA, `false` otherwise (default: `true`)
- `AUTHORIZED_HOST`: CORS origin whitelist (default `*`)
- `API_PORT`: API listening port (default: `3000`)
- `MAX_BALANCE`: maximum address balance beyond which sending of XTZ is refused (default: `6000`)
- `DISABLE_CHALLENGES`: `true` to disable challenges (default: `false`)

## Running the API

Install dependencies and compile Typescript sources to `/dist` directory:

```
npm install
npm run build
```

Run API:

```
npm run start
```

For developing with auto reloading:

```
npm run dev
```

## Docker

### Build

```
docker build . -t tezos-faucet-backend
```

### Run

```
docker run -p 3000:3000 tezos-faucet-backend
```

## API Endpoints

### GET /info

Returns general information about the faucet, including the faucet's address, whether captcha is enabled, the max balance allowed, and the Tez amounts granted per profile.

Example response:

```json
{
  "faucetAddress": "tz1...",
  "captchaEnabled": true,
  "maxBalance": 6000,
  "profiles": {
    "user": {
      "profile": "USER",
      "amount": 1,
      "currency": "tez"
    },
    "baker": {
      "profile": "BAKER",
      "amount": 6000,
      "currency": "tez"
    }
  }
}
```

### POST /challenge

Initiates the Tez request procedure. The user provides their address, profile type (`BAKER` or `USER`), and captcha token (optional).

If a challenge already exists for the user's address in Redis it will be returned in the response. Otherwise the endpoint generates a new challenge and stores it, along with associated data in Redis.

The response contains the challenge string, a challenge counter starting at 1, and the difficulty. The challenge counter indicates the current challenge in a series of Proof of Work challenges that the user must complete. Users aren't privy in advance to the exact number of PoW challenges they'll need to solve to receive the requested Tez.

### POST /verify

Allows users to submit solutions to the challenges. The user provides their address, nonce, solution string, and profile type.

The endpoint verifies the solution by trying to regenerate it using the challenge string and nonce.

If the solution is correct but the required number of challenges have not yet been satisfied, a new challenge is generated and returned in the response.

If all challenges have been completed, the user's address is granted the Tez amount for their profile type. The transaction hash is returned to indicate the transfer was successful.
