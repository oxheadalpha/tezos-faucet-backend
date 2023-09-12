# Tezos Faucet Backend

## Overview

The Tezos Faucet Backend (frontend code [here](https://github.com/oxheadalpha/tezos-faucet)) provides a reliable and secure way to distribute Tez to users. Through the implementation of a Proof of Work (PoW) mechanism, combined with CAPTCHA, we ensure users expend computational resources, thereby preventing bots and malicious actors from spamming and draining the faucet.

Here's a general flow of how it works:

1. **Requesting Tez**: A user initiates the process by making a request for a certain amount of Tez. The backend responds by sending a challenge to the user.
2. **Solving Challenges**: The user must solve the challenge by finding a correct solution. The complexity of the challenge can vary, and the number of challenges to be solved scales linearly with the amount of Tez requested.
3. **Verification & Receiving Tez**: Once the user submits a solution, the backend verifies it. If the solution is correct but there are more challenges to be solved, the user will be sent another challenge. This repeats until all challenges are solved correctly. Only then is the requested Tez granted to the user.

## Prerequisites

- **Node.js** v18
- **Captcha** (Optional): Create a Google [ReCaptcha](https://www.google.com/recaptcha/about/) project. The public site key will be shared with the frontend. Activate domain verification in ReCAPTCHA parameters to allow only communication from the frontend faucet app.
- **Redis** (Optional): If `DISABLE_CHALLENGES` is not set to `false`, set up a Redis server to store PoW challenge data. It's recommended to use a single-instance Redis setup for the challenge data, as this ensures atomicity and helps in avoiding potential exploits. Given that the challenge data isn't persistent or long-term essential, a single instance suffices and is easier to maintain.

## Config

Set environment variables or add them to a `.env` file. See [.env.example](.env.example). The [src/env.ts](src/env.ts) file handles necessary type conversions from environment variable strings.

Mandatory:

- `FAUCET_PRIVATE_KEY`: Faucet's private key to sign transactions
- `CAPTCHA_SECRET`: faucet ReCAPTCHA secret key (mandatory if `ENABLE_CAPTCHA=true`)
- `RPC_URL`: Tezos node RPC URL to connect to

Optional:

- `API_PORT`: API listening port (default: `3000`)
- `AUTHORIZED_HOST`: CORS origin whitelist (default `*`)
- `DISABLE_CHALLENGES`: `true` to disable challenges (default: `false`)
- `ENABLE_CAPTCHA`: `true` to enable ReCAPTCHA, `false` otherwise (default: `true`)
- `MAX_BALANCE`: maximum address balance beyond which sending of XTZ is refused (default: `6000`)
- `MIN_TEZ`: Minimum amount of Tez that can be requested (default: `1`)
- `MAX_TEZ`: Maximum amount of Tez that can be requested (default: `6000`)
- `MAX_CHALLENGES`: Maximum number of challenges required for the maximum Tez request (default: `120`)
- `MIN_CHALLENGES`: Minimum number of challenges required for the minimum Tez request (default: `1`)
- `DIFFICULTY`: Difficulty level for challenges (default: `5`)
- `CHALLENGE_SIZE`: How many bytes the challenge string should be (default: `32`)
- `CAPTCHA_CHALLENGES_REDUCTION_RATIO`: A percentage value between 0 and 1, indicating how much easier challenges should be when a captcha is used (default: `0.5`)

### Configuring Challenges

The `MAX_CHALLENGES`, `MIN_CHALLENGES`, `CHALLENGE_SIZE`, `DIFFICULTY`, `MIN_TEZ`, `MAX_TEZ`, and `CAPTCHA_CHALLENGES_REDUCTION_RATIO` environment variables control the number and difficulty of the challenges that a user must solve to receive Tez.

The `DIFFICULTY` variable determines the complexity of each challenge. A higher value will make each challenge more difficult and time-consuming to solve.

The `MAX_CHALLENGES` and `MIN_CHALLENGES` variables determine the maximum and minimum number of challenges that a user must solve to receive the max and min amount of Tez, respectively. The actual number of challenges scales linearly with the amount of Tez requested. The proportion of the requested Tez to the maximum Tez (`MAX_TEZ`) is calculated, and the number of challenges is scaled based on this proportion. If a captcha is used, the number of challenges is reduced by a certain ratio (`CAPTCHA_CHALLENGES_REDUCTION_RATIO`).

For example, assume with a `DIFFICULTY` of 5 and `CHALLENGE_SIZE` of 32 the average time to find a solution is approximately 5 seconds. Therefore, if `MAX_TEZ` is set to 6000 and `MAX_CHALLENGES` is set to 120, it would take a user about 10 minutes (600 seconds) to receive 6000 Tez. If say `CAPTCHA_CHALLENGES_REDUCTION_RATIO=0.5`, then when using CAPTCHA it should take half the time to solve the challenges and receive Tez. The actual time may vary depending on the user's computational resources.

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
  "challengesEnabled": true,
  "maxBalance": 6000
}
```

### POST /challenge

Initiates the Tez request procedure. The user provides their address, the amount of Tez they want, and captcha token (optional).

If a challenge already exists for the user's address in Redis it will be returned in the response. Otherwise the endpoint generates a new challenge and stores it, along with associated data in Redis.

The response contains the challenge string, a challenge counter starting at 1, and the difficulty. The challenge counter indicates the current challenge in a series of Proof of Work challenges that the user must complete.

### POST /verify

Allows users to submit solutions to the challenges. The user provides their address, nonce, and solution string.

The endpoint verifies the solution by trying to regenerate it using the challenge string and nonce.

If the solution is correct but the required number of challenges have not yet been satisfied, a new challenge is generated and returned in the response.

If all challenges have been completed, the user's address is granted the requested amount of Tez. The transaction hash is returned to indicate the transfer was successful.

## Programmatic Faucet Usage

For programmatic usage of the faucet, we provide a `getTez.js` script located in the `/scripts` directory of the frontend repository. Please refer to it for more details on how to use it. This script can be run from a JavaScript program or directly from a shell. It interacts with the backend to request Tez, solve the required challenges, and verify the solutions.

Please note that the `getTez.js` script does not use CAPTCHA. Therefore, when using the programmatic faucet, challenges can be configured to be more difficult and require more of them to be solved.
