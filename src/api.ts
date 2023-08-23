import env from "./env"

import bodyParser from "body-parser"
import express, { Express, Request, Response } from "express"

import redis from "./redis"
import { challengeMiddleware, verifyMiddleware } from "./middleware"
import { httpLogger } from "./logging"
import { Tezos, sendTezAndRespond } from "./Tezos"
import { validateCaptcha } from "./Captcha"
import * as pow from "./pow"
import profiles, { Profile } from "./profiles"
import { InfoResponseBody, ProfileInfo } from "./Types"

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

app.get("/info", async (_, res: Response) => {
  try {
    const profilesInfo: Record<Profile, ProfileInfo> = Object.fromEntries(
      Object.entries(profiles).map(([profile, profileConfig]) => [
        profile,
        {
          profile,
          amount: profileConfig.amount,
          currency: "tez",
        },
      ])
    )

    const info: InfoResponseBody = {
      faucetAddress: await Tezos.signer.publicKeyHash(),
      captchaEnabled: env.ENABLE_CAPTCHA,
      maxBalance: env.MAX_BALANCE,
      profiles: profilesInfo,
    }
    return res.status(200).send(info)
  } catch (error) {
    console.error(error)
    return res
      .status(500)
      .send({ status: "ERROR", message: "An exception occurred" })
  }
})

app.post(
  "/challenge",
  challengeMiddleware,
  async (req: Request, res: Response) => {
    const { address, captchaToken, profile } = req.body

    if (captchaToken && !(await validateCaptcha(res, captchaToken))) return

    try {
      const challengeKey = pow.getChallengeKey(address)
      let {
        challenge,
        challengesNeeded,
        challengeCounter,
        difficulty,
        profile: currentProfile,
      } = (await pow.getChallenge(challengeKey)) || {}

      // If no challenge exists or the profile has changed, start a new challenge.
      if (!challenge || profile !== currentProfile) {
        // If a captcha was sent it was validated above.
        const usedCaptcha = env.ENABLE_CAPTCHA && !!captchaToken

        challengeCounter = 1
        ;({ challenge, challengesNeeded, difficulty } = pow.createChallenge(
          usedCaptcha,
          profile
        ))

        await pow.saveChallenge(challengeKey, {
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

    if (env.DISABLE_CHALLENGES) {
      await sendTezAndRespond(res, address, profile)
      return
    }

    const challengeKey = pow.getChallengeKey(address)
    const redisChallenge = await pow.getChallenge(challengeKey)
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

    const isValidSolution = pow.verifySolution({
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
      const newChallenge = pow.createChallenge(usedCaptcha, profile)
      const resData = {
        challenge: newChallenge.challenge,
        challengeCounter: challengeCounter + 1,
        difficulty: newChallenge.difficulty,
      }

      await pow.saveChallenge(challengeKey, {
        challengesNeeded: newChallenge.challengesNeeded,
        profile,
        ...resData,
      })
      return res.status(200).send({ status: "SUCCESS", ...resData })
    }

    // The challenge should be deleted from redis before Tez is sent. If it
    // failed to delete or was already deleted by another request, the user
    // could keep getting Tez with the same solution.
    const deletedCount = await redis.del(challengeKey).catch((err: any) => {
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
    return
  } catch (err: any) {
    console.error(err)
    return res
      .status(500)
      .send({ status: "ERROR", message: "An error occurred" })
  }
})

// Connect to redis, start server, and setup listeners for graceful shutdown.
;(async () => {
  if (!env.DISABLE_CHALLENGES) {
    await redis.connect()
  } else {
    console.log("Challenges are disabled. Not connecting to redis.")
  }

  const port = process.env.API_PORT || 3000
  const server = app.listen(port, () =>
    console.log(`Listening on port ${port}.`)
  )

  const gracefulShutdown = async (signal: string) => {
    console.log(`${signal} signal received`)

    if (!env.DISABLE_CHALLENGES) {
      try {
        await redis.quit()
        console.log("Redis connection closed.")
      } catch (err) {
        console.error("Error closing Redis connection:", err)
      }
    }

    server.close(() => {
      console.log("HTTP server closed.")
      process.exit(0)
    })
  }

  process.on("SIGINT", () => gracefulShutdown("SIGINT"))
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
})()
