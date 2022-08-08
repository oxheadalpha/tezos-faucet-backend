# Tezos testnet faucet API

## Config

Set environment variables:

- `FAUCET_PRIVATE_KEY`: Private key of the faucet, to sign transaction (mandatory)
- `FAUCET_ADDRESS`: faucet address (mandatory)
- `ENABLE_CAPTCHA`: true to enable ReCAPTCHA, false otherwise (default: true)
- `FAUCET_CAPTCHA_SECRET`: Faucet ReCAPTCHA secret key (mandatory if ENABLE_CAPTCHA=true)
- `AUTHORIZED_HOST`: authorized host, for CORS (default: *).
- `API_PORT`: API listening port (default: 3000)
- `RPC_URL`: Tezos client RPC URL (mandatory)
- `FAUCET_AMOUNT_USER`: number of XTZ to send for a regular request (default: 1)
- `FAUCET_AMOUNT_BAKER`: number of XTZ to send for a baker request (default: 6000)
- `MAX_BALANCE`: maximum balance to request XTZ (default: 6000)

## Security

Activate domain verification in ReCAPTCHA parameters.

## Deploy

### Build

```
docker build . -t tezos-testnet-faucet-api
```

### Run

```
docker run -p 3000:3000 tezos-testnet-faucet-api
```

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