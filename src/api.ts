import dotenv from "dotenv"
dotenv.config()

import bodyParser from "body-parser"
import express, { Express, Request, Response } from "express"
import { createClient } from "redis"

import { httpLogger } from "./logging"
import { validateCaptcha, CAPTCHA_ENABLED } from "./Captcha"
import {
  MAX_BALANCE,
  getTezAmountForProfile,
  sendTez,
  validateAddress,
} from "./Tezos"
import {
  createChallenge,
  getChallengeKey,
  saveChallenge,
  getChallenge,
  verifySolution,
} from "./pow"
import { InfoResponseBody, Profile } from "./Types"

export const redis = createClient({
  url: process.env.REDIS_URL,
  password: process.env.REDIS_PASSWORD,
}).on("error", (err: any) => console.log("Redis Client Error:", err))

const app: Express = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(httpLogger)
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
        amount: getTezAmountForProfile(Profile.USER),
        currency: "tez",
      },
      baker: {
        profile: Profile.BAKER,
        amount: getTezAmountForProfile(Profile.BAKER),
        currency: "tez",
      },
    }

    const info: InfoResponseBody = {
      faucetAddress: process.env.FAUCET_ADDRESS,
      captchaEnabled: CAPTCHA_ENABLED,
      maxBalance: MAX_BALANCE,
      profiles,
    }
    res.status(200).send(info)
  } catch (error) {
    console.error(error)
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
    let { challenge, challengesNeeded, challengeCounter, difficulty } =
      (await getChallenge(challengeKey)) || {}

    if (!challenge) {
      // If a captcha was sent it was validated above.
      const usedCaptcha = CAPTCHA_ENABLED && !!captchaToken
      ;({ challenge, challengesNeeded, difficulty } =
        createChallenge(usedCaptcha))
      challengeCounter = 1
      await saveChallenge(challengeKey, {
        challenge,
        challengesNeeded,
        challengeCounter,
        difficulty,
        usedCaptcha,
      })
    }

    return res.status(200).send({
      status: "SUCCESS",
      challenge,
      challengeCounter,
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

  if (!address || !solution || !nonce || !profile) {
    return res.status(400).send({
      status: "ERROR",
      message:
        "'address', 'solution', 'nonce', and 'profile' fields are required",
    })
  }

  if (!validateAddress(res, address)) return

  let amount

  try {
    amount = getTezAmountForProfile(profile)
  } catch (e: any) {
    return res.status(400).send({ status: "ERROR", message: e.message })
  }

  try {
    const challengeKey = getChallengeKey(address)
    const redisChallenge = await getChallenge(challengeKey)
    if (!redisChallenge) {
      return res
        .status(400)
        .send({ status: "ERROR", message: "No challenge found" })
    }

    const {
      challenge,
      challengesNeeded,
      challengeCounter,
      difficulty,
      usedCaptcha,
    } = redisChallenge

    const isValidSolution = verifySolution({
      challenge,
      difficulty,
      nonce,
      solution,
    })

    if (!isValidSolution) {
      return res
        .status(400)
        .send({ status: "ERROR", message: "Incorrect solution" })
    }

    if (challengeCounter < challengesNeeded) {
      const newChallenge = createChallenge(usedCaptcha)
      const resData = {
        challenge: newChallenge.challenge,
        challengeCounter: challengeCounter + 1,
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

    const txHash = await sendTez(amount, address)

    if (!txHash) {
      return res
        .status(403)
        .send({ status: "ERROR", message: "You have already enough ꜩ" })
    }

    return res
      .status(200)
      .send({ txHash, status: "SUCCESS", message: "Tez sent" })
  } catch (err: any) {
    console.error(err)
    return res
      .status(500)
      .send({ status: "ERROR", message: "An error occurred" })
  }
})

const port = process.env.API_PORT || 3000

;(async () => {
  await redis.connect()
  console.log("Connected to redis.")

  app.listen(port, () => {
    console.log(`Listening on port ${port}.`)
  })
})()
