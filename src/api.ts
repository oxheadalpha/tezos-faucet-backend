import bodyParser from "body-parser"
import dotenv from "dotenv"
import express, { Express, Request, Response } from "express"
import morgan from "morgan"
import { createClient } from "redis"

import { validateCaptcha } from "./Captcha"
import {
  defaultBakerAmount,
  defaultUserAmount,
  getTezAmountForProfile,
  send,
  validateAddress,
} from "./Tezos"
import { InfoResponseBody, Profile, RequestBody, ResponseBody } from "./Types"
import { generateChallenge, getChallengeKey, verifySolution } from "./pow"

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
    res.status(400).send("'address' and 'profile' fields are required")
    return
  }

  if (!validateAddress(res, address)) return
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
      challenge = generateChallenge()
      // Set the challenge and challenge counter.
      await redis.hSet(challengekey, {
        challenge,
        counter: 1,
      })
      // Challenge should expire after 30m.
      await redis.expire(challengekey, 1800)
    }

    console.log({ challenge, difficulty: DIFFICULTY })
    res.status(200).send({ status: "SUCCESS", challenge, difficulty: DIFFICULTY })
  } catch (err: any) {
    const message = "Error getting challenge"
    console.error(message, err)
    res.status(500).send({ status: "ERROR", message })
  }
})

app.post("/verify", async (req: Request, res: Response) => {
  const { address, captchaToken, solution, nonce } = req.body

  if (!address || !solution || !nonce) {
    res.status(400).send({
      status: "ERROR",
      message: "'address', 'solution', and 'nonce' fields are required",
    })
    return
  }

  if (!validateAddress(res, address)) return
  if (!validateCaptcha(res, captchaToken)) return

  const challengeKey = getChallengeKey(address)

  const { challenge, counter } = await redis.hGetAll(challengeKey)

  // Validate the solution by checking that the SHA-256 hash of the challenge concatenated with the nonce
  // starts with a certain number of zeroes (the difficulty)
  const isValidSolution = verifySolution({
    challenge,
    difficulty: DIFFICULTY,
    nonce,
    solution,
  })

  console.log({ address, solution, nonce, counter })

  if (!isValidSolution) {
    res.status(400).send({ status: "ERROR", message: "Incorrect solution" })
    return
  }

  try {
    const challengeCounter = Number(counter)
    if (challengeCounter < CHALLENGES_NEEDED) {
      console.log(`GETTING CHALLENGE ${challengeCounter}`)
      const newChallenge = generateChallenge()
      await redis.hSet(challengeKey, {
        challenge: newChallenge,
        counter: challengeCounter + 1,
      })
      res.status(200).send({ status: "SUCCESS", challenge: newChallenge, difficulty: DIFFICULTY })
      return
    }

    // Here is where you would send the tez to the user's address
    // For the sake of this example, we're just logging the address
    console.log(`Send tez to ${address}`)
    const amount = getTezAmountForProfile("BAKER" as Profile)
    const b: any = {}
    // b.txHash = await send(amount, address)
    res.status(200).send({ ...b, status: "SUCCESS", message: "Tez sent" })

    await redis.del(challengeKey).catch((e) => console.error(e.message))
  } catch (err: any) {
    console.error(err.message)
    res.status(500).send({ status: "ERROR", message: "An error occurred" })
  }
})

const port: number = process.env.API_PORT || 3000

;(async () => {
  app.listen(port, async () => {
    console.log(`Start API on port ${port}.`)
  })

  await redis.connect()
  console.log("Connected to redis.")
})()
