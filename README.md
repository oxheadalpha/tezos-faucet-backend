# Tezos testnet faucet API

## Deploy

### Build

```
docker build . -t tezos-testnet-faucet-api
```

### Run

```
docker run -p 3000:3000 tezos-testnet-faucet-api
```

## Config

Set environment variables

Mandatory:

- `FAUCET_PRIVATE_KEY`: private key of the faucet, to sign transaction
- `FAUCET_ADDRESS`: faucet address
- `FAUCET_CAPTCHA_SECRET`: faucet ReCAPTCHA secret key (mandatory if ENABLE_CAPTCHA=true)
- `RPC_URL`: Tezos node RPC URL to connect to

Optional:

- `ENABLE_CAPTCHA`: true to enable ReCAPTCHA, false otherwise (default: true)
- `AUTHORIZED_HOST`: authorized host, for CORS (default: *).
- `API_PORT`: API listening port (default: 3000)
- `FAUCET_AMOUNT_USER`: number of XTZ to send for a regular request (default: 1)
- `FAUCET_AMOUNT_BAKER`: number of XTZ to send for a baker request (default: 6000)
- `MAX_BALANCE`: maximum user balance beyond which sending of XTZ is refused (default: 6000)

## Security

Activate domain verification in ReCAPTCHA parameters to allow only calls from the Front faucet.

## Use

### Request

Request URL:
```
POST /send
```

Request body:
```
{
    captchaToken:"...",
    address:"tz1...",
    profile:"USER"
}
```

- `token`: ReCaptcha user response token
- `address`: address to send XTZ to
- `profile`: USER for a regular user who will get 1 xtz. BAKER for a baker profile, who will get 6000 xtz.

### Response

#### Success

Return code: HTTP 200

Response body:
```
{
    "status": "SUCCESS",
    "txHash":"..."
}
```

- `status`: SUCCESS
- `txHash`: hash of transaction


#### Error

Return code:

- HTTP 400: Bad request (wrong captcha token)
- HTTP 500: Server or Tezos node error


Response body:
```
{
    "status": "ERROR",
    "message": "Captcha error"
}
```

- `status`: ERROR
- `message`: error message