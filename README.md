# Tezos Faucet Backend

## Overview

The Tezos Faucet Backend (frontend code [here](https://github.com/oxheadalpha/tezos-faucet)) provides a reliable and secure way to distribute Tez to users. Through the implementation of a Proof of Work (PoW) mechanism, combined with CAPTCHA, we ensure users expend computational resources, thereby preventing bots and malicious actors from spamming and draining the faucet.

Here's a general flow of how it works:

1. **Requesting Tez**: A user initiates the process by making a request for a certain amount of Tez. The backend responds by sending a challenge to the user.
2. **Solving Challenges**: The user must solve the challenge by finding a correct solution. The complexity of the challenge can vary, and the number of challenges to be solved scales linearly with the amount of Tez requested.
3. **Verification & Receiving Tez**: Once the user submits a solution, the backend verifies it. If the solution is correct but there are more challenges to be solved, the user will be sent another challenge. This repeats until all challenges are solved correctly. Only then is the requested Tez granted to the user.

## Programmatic Faucet Usage

For programmatic usage of the faucet, we provide an npm package `@oxheadalpha/get-tez`. The code can be found [here](https://github.com/oxheadalpha/tezos-faucet/tree/main/getTez). Please refer to it for more details on how to use it. This script can be run from a JavaScript program or directly from a shell. It interacts with the backend to request Tez, solve the required challenges, and verify the solutions.

Please note that the programmatic faucet code does not use CAPTCHA and so more challenges can be given when using it.

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
- `MAX_BALANCE`: maximum address balance beyond which sending of XTZ is refused (default: `null`)
- `MIN_TEZ`: Minimum amount of Tez that can be requested (default: `1`)
- `MAX_TEZ`: Maximum amount of Tez that can be requested (default: `6000`)
- `DIFFICULTY`: Difficulty level for challenges (default: `4`)
- `CHALLENGE_SIZE`: How many bytes the challenge string should be (default: `2048`)
- `MIN_CHALLENGES`: Minimum number of challenges required for the minimum Tez request (default: `1`)
- `MAX_CHALLENGES`: Maximum number of challenges required for the maximum Tez request (default: `550`)
- `MAX_CHALLENGES_WITH_CAPTCHA`: Maximum number of challenges required for the maximum Tez request when a captcha is used (default: `66`)

### Configuring Challenges

The `MAX_CHALLENGES`, `MIN_CHALLENGES`, `CHALLENGE_SIZE`, `DIFFICULTY`, `MIN_TEZ`, `MAX_TEZ`, and `MAX_CHALLENGES_WITH_CAPTCHA` environment variables control the number and difficulty of the challenges that a user must solve to receive Tez.

The `DIFFICULTY` variable determines the complexity of each challenge. A higher value will make each challenge more difficult and time-consuming to solve.

The `MAX_CHALLENGES` and `MIN_CHALLENGES` variables determine the maximum and minimum number of challenges that a user must solve to receive the max and min amount of Tez, respectively. The actual number of challenges scales linearly with the amount of Tez requested. The proportion of the requested Tez to the maximum Tez (`MAX_TEZ` or `MAX_CHALLENGES_WITH_CAPTCHA` if captcha is used) is calculated, and the number of challenges is scaled based on this proportion.

For example, assume with a `DIFFICULTY` of 4 and `CHALLENGE_SIZE` of 2048 the average time to find a solution is approximately 1.09 seconds when using the `get-tez` script from the CLI or in a Node.js program, and approximately 4.6 seconds when solving challenges in the browser with the faucet frontend. Therefore, if `MAX_TEZ` is set to 6000 and `MAX_CHALLENGES` is set to 550, it would take a user about 10 minutes (600 seconds) to receive 6000 Tez when using the `get-tez` script. With `MAX_CHALLENGES_WITH_CAPTCHA` set to 66, when using CAPTCHA via the browser it should take about 5 minutes to solve the challenges and receive Tez. The actual time may vary a bit depending on the user's computational resources.

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

#### Backend URL
For faucets hosted on https://teztnets.xyz, their backend urls can be found at https://teztnets.xyz/teztnets.json under `faucet_url`.

### **GET `/info`**

Returns details like the faucet's address, whether captcha and challenges are enabled, the maximum balance allowed, and the min and max Tez request amounts.

```json
{
  "faucetAddress": "tz1...",
  "captchaEnabled": true,
  "challengesEnabled": true,
  "maxBalance": 6000,
  "minTez": 1,
  "maxTez": 6000
}
```

### **POST `/challenge`**

Initiate the Tez request procedure.

**Request**:

```json
{
  "address": "tz1...",
  "amount": 10
}
```

**Response**:
The server provides a challenge string, challenge counter, and difficulty.

```json
{
  "challenge": "a3f7...",
  "challengeCounter": 1,
  "difficulty": 4
}
```

If a challenge already exists for the user's address in Redis, it will be returned in the response. Otherwise the endpoint generates a new challenge and stores it in Redis.

The challenge counter indicates the current challenge number in a series of Proof of Work challenges that the user must complete.

**Solving the Challenge**:
You need to find a nonce such that the SHA-256 hash of the concatenated string (challenge + nonce) begins with a number of zeros equivalent to the given `difficulty`. For instance, if the difficulty is 4, then the hash should start with four leading zeros, e.g., `0000abcd1234...`. The nonce is an arbitrary number that is iteratively increased until the condition is met.

**Pseudocode**:

```pseudocode
nonce = 0
do {
    combined_string = challenge_string + nonce
    hash_result = sha256(combined_string)
    nonce++
} while (hash_result does not start with `difficulty` number of zero bytes)
```

### **POST `/verify`**

Submit challenge solutions and receive Tez.

**Request**:

```json
{
  "address": "tz1...",
  "nonce": 123456, // found from above pseudocode
  "solution": "0000ABC..." // hash_result from above pseudocode
}
```

The endpoint verifies the solution by trying to regenerate it using the challenge string and nonce.

**Response**:
Based on whether all required challenges are solved, the server either:

- Sends another challenge:

```json
{
  "challenge": "b4u92...",
  "challengeCounter": 2,
  "difficulty": 4
}
```

- Grants the requested Tez amount and returns a transaction hash.

```json
{ "txHash": "oo7X..." }
```

**Note**: If `DISABLE_CHALLENGES` is `true`, `amount` should be sent in the request to the `/verify` endpoint, which will immediately grant Tez.

