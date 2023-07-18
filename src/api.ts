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
  createChallenge,
  getChallengeKey,
  saveChallenge,
  getChallenge,
  verifySolution,
} from "./pow"

dotenv.config()

export const redis = createClient({
  // url: "redis://localhost:6379",
}).on("error", (err: any) => console.log("Redis Client Error", err))

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
    let { challenge, challengesNeeded, counter, difficulty } =
      (await getChallenge(challengeKey)) || {}

    if (!challenge) {
      // If a captcha was sent it was validated above.
      const usedCaptcha = !!captchaToken
      ;({ challenge, challengesNeeded, difficulty } =
        createChallenge(usedCaptcha))
      counter = 1
      await saveChallenge(challengeKey, {
        challenge,
        challengesNeeded,
        counter,
        difficulty,
        usedCaptcha,
      })
    }

    console.log({ challenge, difficulty })

    return res.status(200).send({
      status: "SUCCESS",
      challenge,
      counter,
      difficulty,
    })
  } catch (err: any) {
    const message = "Error getting challenge"
    console.error(message, err)
    return res.status(500).send({ status: "ERROR", message })
  }
})

app.post("/verify", async (req: Request, res: Response) => {
  const { address, solution, nonce, profile } = req.body

  if (!address || !solution || !nonce) {
    return res.status(400).send({
      status: "ERROR",
      message: "'address', 'solution', and 'nonce' fields are required",
    })
  }

  if (!validateAddress(res, address)) return

  try {
    const challengeKey = getChallengeKey(address)
    const redisChallenge = await getChallenge(challengeKey)
    if (!redisChallenge) {
      return res
        .status(400)
        .send({ status: "ERROR", message: "No challenge found" })
    }

    const { challenge, challengesNeeded, counter, difficulty, usedCaptcha } =
      redisChallenge

    const isValidSolution = verifySolution({
      challenge,
      difficulty,
      nonce,
      solution,
    })

    console.log({ address, solution, nonce, counter })

    if (!isValidSolution) {
      return res
        .status(400)
        .send({ status: "ERROR", message: "Incorrect solution" })
    }

    if (counter < challengesNeeded) {
      const newChallenge = createChallenge(usedCaptcha)
      const resData = {
        challenge: newChallenge.challenge,
        counter: counter + 1,
        difficulty: newChallenge.difficulty,
      }

      await saveChallenge(challengeKey, {
        challengesNeeded: newChallenge.challengesNeeded,
        ...resData,
      })
      return res.status(200).send({ status: "SUCCESS", ...resData })
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
