import express, { Express, Request, Response } from "express"
import bodyParser from "body-parser"
import morgan from "morgan"
import dotenv from "dotenv"
import crypto from "crypto"
import { createClient } from "redis"

import { Profile, RequestBody, ResponseBody, InfoResponseBody } from "./Types"
import { validateCaptcha } from "./Captcha"
import {
  getTezAmountForProfile,
  defaultBakerAmount,
  defaultUserAmount,
} from "./Tezos"

dotenv.config()

const redis = createClient({
  // url: "redis://localhost:6379",
}) // reject

redis.on("error", (err) => console.log("Redis Client Error", err))

const app: Express = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(morgan("dev"))

app.use((_, res: Response, next) => {
  const cors: string = process.env.AUTHORIZED_HOST || "*"
  res.setHeader("Access-Control-Allow-Origin", cors)
  res.setHeader("Access-Control-Allow-Methods", "GET, POST")
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  )

  next()
})

app.get("/info", (_, res: Response) => {
  try {
    const profiles: any = {
      user: {
        profile: Profile.USER,
        amount: process.env.FAUCET_AMOUNT_USER || defaultUserAmount,
        currency: "tez",
      },
      baker: {
        profile: Profile.BAKER,
        amount: process.env.FAUCET_AMOUNT_BAKER || defaultBakerAmount,
        currency: "tez",
      },
    }

    const info: InfoResponseBody = {
      faucetAddress: process.env.FAUCET_ADDRESS,
      captchaEnable: JSON.parse(process.env.ENABLE_CAPTCHA),
      profiles,
      maxBalance: process.env.MAX_BALANCE,
    }
    res.status(200).send(info)
  } catch (error) {
    res.status(500).send({ status: "ERROR", message: "An exception occurred" })
  }
})

const DIFFICULTY = 3
const CHALLENGES_NEEDED = 4

app.post("/challenge", async (req: Request, res: Response) => {
  const { address, captchaToken, profile } = req.body

  if (!address || !profile) {
    res.status(400).send("'address' and 'profile' are required")
    return
  }

  if (!validateCaptcha(res, captchaToken)) return

  try {
    getTezAmountForProfile(profile)
  } catch (e: any) {
    res.status(400).send({ status: "ERROR", message: e.message })
    return
  }

  try {
    const challengekey = `address:${address}`
    let challenge = await redis.hGet(challengekey, "challenge")

    if (!challenge) {
      challenge = crypto.randomBytes(32).toString("hex")
      // Set the challenge and challenge counter.
      await redis.hSet(challengekey, {
        challenge,
        counter: 1,
      })
      await redis.expire(challengekey, 1800)
    }

    console.log({ challenge, difficulty: DIFFICULTY })
    res.status(200).send({ challenge, difficulty: DIFFICULTY })
  } catch (err) {
    const message = "Error fetching challenge"
    console.error(message, err)
    res.status(500).send({ status: "ERROR", message })
  }
})

app.post("/verify", async (req: Request, res: Response) => {
  const { address, captchaToken, solution, nonce } = req.body

  if (!address || !solution || !nonce) {
    res.status(400).send({
      status: "ERROR",
      message: "'address', 'solution', and 'nonce' are required",
    })
    return
  }

  if (!validateCaptcha(res, captchaToken)) return

  const challengeKey = `address:${address}`
  // await redis.watch(`address:${address}`)
  const { challenge, counter } = await redis.hGetAll(challengeKey)

  // Validate the solution by checking that the SHA-256 hash of the challenge concatenated with the nonce
  // starts with a certain number of zeroes (the difficulty)
  const hash = crypto
    .createHash("sha256")
    .update(`${challenge}:${nonce}`)
    .digest("hex")

  console.log({ address, solution, hash, nonce, counter })

  if (hash === solution && hash.startsWith("0".repeat(DIFFICULTY) + "8")) {
    const challengeCounter = Number(counter)
    if (challengeCounter < CHALLENGES_NEEDED) {
      console.log("GETTING NEW CHALLENGE")
      const newChallenge = crypto.randomBytes(32).toString("hex")
      const result = await redis.hSet(challengeKey, {
        challenge: newChallenge,
        counter: challengeCounter + 1,
      })
      res.status(200).send({ challenge: newChallenge, difficulty: DIFFICULTY })
      return
    }

    // Here is where you would send the tez to the user's address
    // For the sake of this example, we're just logging the address
    console.log(`Send tez to ${address}`)
    // getTezAmountForProfile(profile)
    // responseBody.txHash = await send(amount, address)

    // Delete the challenge from Redis
    await redis.del(challengeKey)

    res.status(200).send({ status: "SUCCESS", message: "Tez sent" })
  } else {
    // The solution is incorrect
    res.status(400).send({ status: "ERROR", message: "Incorrect solution" })
  }
})

const port: number = process.env.API_PORT || 3000

app.listen(port, async () => {
  console.log(`Start API on port ${port}.`)
  await redis.connect()
  console.log("Connected to redis.")
})
