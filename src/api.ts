import dotenv from "dotenv"
dotenv.config()

import bodyParser from "body-parser"
import express, { Express, NextFunction, Request, Response } from "express"
import { createClient } from "redis"

import { httpLogger } from "./logging"
import { challengeMiddleware, verifyMiddleware } from "./middleware"
import { validateCaptcha, CAPTCHA_ENABLED } from "./Captcha"
import { MAX_BALANCE, getTezAmountForProfile, sendTezAndRespond } from "./Tezos"
import {
  DISABLE_CHALLENGES,
  createChallenge,
  getChallengeKey,
  saveChallenge,
  getChallenge,
  verifySolution,
} from "./pow"
import { InfoResponseBody, Profiles } from "./Types"

export const redis = createClient({
  url: process.env.REDIS_URL,
  password: process.env.REDIS_PASSWORD,
})
  .on("connect", () => console.log("Connected to redis."))
  .on("error", (err: any) => console.error("Redis Client Error:", err))

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
        profile: Profiles.USER,
        amount: getTezAmountForProfile(Profiles.USER),
        currency: "tez",
      },
      baker: {
        profile: Profiles.BAKER,
        amount: getTezAmountForProfile(Profiles.BAKER),
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

app.post(
  "/challenge",
  challengeMiddleware,
  async (req: Request, res: Response) => {
    const { address, captchaToken, profile } = req.body

    if (captchaToken && !(await validateCaptcha(res, captchaToken))) return

    try {
      const challengeKey = getChallengeKey(address)
      let {
        challenge,
        challengesNeeded,
        challengeCounter,
        difficulty,
        profile: currentProfile,
      } = (await getChallenge(challengeKey)) || {}
      console.log(profile, currentProfile, challengeCounter)
      // If no challenge exists or the profile has changed, start a new challenge.
      if (!challenge || profile !== currentProfile) {
        // If a captcha was sent it was validated above.
        const usedCaptcha = CAPTCHA_ENABLED && !!captchaToken
        ;({ challenge, challengesNeeded, difficulty } = createChallenge(
          usedCaptcha,
          profile
        ))
        challengeCounter = 1
        await saveChallenge(challengeKey, {
          challenge,
          challengesNeeded,
          challengeCounter,
          difficulty,
          usedCaptcha,
          profile,
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
  }
)

app.post("/verify", verifyMiddleware, async (req: Request, res: Response) => {
  try {
    const { address, solution, nonce, profile } = req.body

    if (DISABLE_CHALLENGES) {
      await sendTezAndRespond(res, address, profile)
      return
    }

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
      profile: currentProfile,
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
      const newChallenge = createChallenge(usedCaptcha, profile)
      const resData = {
        challenge: newChallenge.challenge,
        challengeCounter: challengeCounter + 1,
        difficulty: newChallenge.difficulty,
      }

      await saveChallenge(challengeKey, {
        challengesNeeded: newChallenge.challengesNeeded,
        profile,
        ...resData,
      })
      return res.status(200).send({ status: "SUCCESS", ...resData })
    }

    // The challenge should be deleted from redis before Tez is sent. If it
    // failed to delete or was already deleted by another request, the user
    // could keep getting Tez with the same solution.
    const deletedCount = await redis.del(challengeKey).catch((err) => {
      console.error(`Redis failed to delete ${challengeKey}.`)
      throw err
    })

    if (deletedCount === 0) {
      // Challenge was already used/deleted, so do not send Tez
      return res
        .status(403)
        .send({ status: "ERROR", message: "PoW challenge not found" })
    }

    await sendTezAndRespond(res, address, currentProfile)
  } catch (err: any) {
    console.error(err)
    return res
      .status(500)
      .send({ status: "ERROR", message: "An error occurred" })
  }
})

// Connect to redis, start server, and setup listeners for graceful shutdown.
;(async () => {
  await redis.connect()

  const port = process.env.API_PORT || 3000
  const server = app.listen(port, () =>
    console.log(`Listening on port ${port}.`)
  )

  const gracefulShutdown = async (signal: string) => {
    console.log(`${signal} signal received`)

    try {
      await redis.quit()
      console.log("Redis connection closed.")
    } catch (err) {
      console.error("Error closing Redis connection:", err)
    }

    server.close(() => {
      console.log("HTTP server closed.")
      process.exit(0)
    })
  }

  process.on("SIGINT", () => gracefulShutdown("SIGINT"))
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
})()
