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
import {
  generateChallenge,
  getChallengeKey,
  saveChallenge,
  getChallenge,
  verifySolution,
} from "./pow"

dotenv.config()

export const redis = createClient({
  // url: "redis://localhost:6379",
})

redis.on("error", (err: any) => console.log("Redis Client Error", err))

const app: Express = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(morgan("dev"))

app.use((_, res: Response, next) => {
  const cors = process.env.AUTHORIZED_HOST || "*"
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

const DIFFICULTY = 4
const CHALLENGES_NEEDED = 4

app.post("/challenge", async (req: Request, res: Response) => {
  const { address, captchaToken, profile } = req.body

  if (!address || !profile) {
    return res.status(400).send({
      satus: "ERROR",
      message: "'address' and 'profile' fields are required",
    })
  }

  if (!validateAddress(res, address)) return
  if (captchaToken && !(await validateCaptcha(res, captchaToken))) return

  try {
    getTezAmountForProfile(profile)
  } catch (e: any) {
    return res.status(400).send({ status: "ERROR", message: e.message })
  }

  try {
    const challengeKey = getChallengeKey(address)
    let { challenge, counter } = await getChallenge(challengeKey)

    if (!challenge) {
      challenge = generateChallenge()
      counter = 1
      await saveChallenge({
        challenge,
        challengeKey,
        counter,
        // If a captcha was sent it was validated above.
        usedCaptcha: !!captchaToken,
      })
    }

    console.log({ challenge, difficulty: DIFFICULTY })
    return res.status(200).send({
      status: "SUCCESS",
      challenge,
      counter,
      difficulty: DIFFICULTY,
    })
  } catch (err: any) {
    const message = "Error getting challenge"
    console.error(message, err)
    return res.status(500).send({ status: "ERROR", message })
  }
})

app.post("/verify", async (req: Request, res: Response) => {
  const { address, captchaToken, solution, nonce, profile } = req.body

  if (!address || !solution || !nonce) {
    return res.status(400).send({
      status: "ERROR",
      message: "'address', 'solution', and 'nonce' fields are required",
    })
  }

  if (!validateAddress(res, address)) return

  try {
    const challengeKey = getChallengeKey(address)
    const { challenge, counter, usedCaptcha } = await getChallenge(challengeKey)

    if (!challenge || !counter) {
      return res
        .status(400)
        .send({ status: "ERROR", message: "No challenge found" })
    }

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
      return res
        .status(400)
        .send({ status: "ERROR", message: "Incorrect solution" })
    }

    if (counter < CHALLENGES_NEEDED) {
      console.log(`GETTING CHALLENGE ${counter}`)
      const newChallenge = generateChallenge()
      const incrCounter = counter + 1
      await saveChallenge({
        challenge: newChallenge,
        challengeKey,
        counter: incrCounter,
      })

      return res.status(200).send({
        status: "SUCCESS",
        challenge: newChallenge,
        counter: incrCounter,
        difficulty: DIFFICULTY,
      })
    }

    // The challenge should be deleted from redis before Tez is sent. If it
    // failed to delete, the user could keep getting Tez with the same solution.
    await redis.del(challengeKey).catch((e) => {
      console.error(`Redis failed to delete ${challengeKey}.`)
      throw e
    })


    // Here is where you would send the tez to the user's address
    // For the sake of this example, we're just logging the address
    console.log(`Send tez to ${address}`)
    const amount = getTezAmountForProfile("BAKER" as Profile)
    const b: any = {}
    // b.txHash = await send(amount, address)
    b.txHash = "hash"
    return res
      .status(200)
      .send({ ...b, status: "SUCCESS", message: "Tez sent" })
  } catch (err: any) {
    console.error(err.message)
    return res
      .status(500)
      .send({ status: "ERROR", message: "An error occurred" })
  }
})

const port: number = process.env.API_PORT || 3000

;(async () => {
  await redis.connect()
  console.log("Connected to redis.")

  app.listen(port, () => {
    console.log(`Start API on port ${port}.`)
  })
})()
