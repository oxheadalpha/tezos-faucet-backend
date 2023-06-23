import express, { Express, Request, Response } from "express"
import bodyParser from "body-parser"
import morgan from "morgan"
import dotenv from "dotenv"
import crypto from "crypto"
import { createClient } from "redis"

import { Profile, RequestBody, ResponseBody, InfoResponseBody } from "./Types"
import { checkCaptcha } from "./Captcha"
import { getTezAmountForProfile } from "./Tezos"

dotenv.config()
const redisClient = createClient({
  // url: "redis://localhost:6379",
}) // reject
redisClient.on("error", (err) => console.log("Redis Client Error", err))

const defaultPort: number = 3000
const defaultUserAmount: number = 1
const defaultBakerAmount: number = 6000

const app: Express = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(morgan("dev"))

app.use((req: Request, res: Response, next) => {
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
  console.log("Get info")
  try {
    let profiles: any = {
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

    let info: InfoResponseBody = {
      faucetAddress: process.env.FAUCET_ADDRESS,
      captchaEnable: JSON.parse(process.env.ENABLE_CAPTCHA),
      profiles: profiles,
      maxBalance: process.env.MAX_BALANCE,
    }

    res.status(200)
    res.send(info)
  } catch (error) {
    res.status(400)
    res.send("Exception")
  }
})

const DIFFICULTY = 4
app.post("/challenge", async (req: Request, res: Response) => {
  const { address, captchaToken, profile } = req.body

  console.log(req.body)

  const validCaptcha = await checkCaptcha(captchaToken).catch((e) =>
    res.status(400).send(e.message)
  )

  if (validCaptcha) {
    console.log("GOOD TOKEN")
  } else {
    console.log("BAD TOKEN")
    res.status(400).send({ status: "ERROR", message: "Captcha error" })
    return
  }

  if (!address) {
    res.status(400).send("The address property is required.")
    return
  }

  try {
    getTezAmountForProfile(profile)
  } catch (e: any) {
    res.status(400).send({ status: "ERROR", message: e.message })
    return
  }

  // Generate or return existing PoW challenge.
  const challenge =
    (await redisClient.get(`address:${address}:challenge`)) ||
    crypto.randomBytes(32).toString("hex")
  // const challenge = crypto.randomBytes(32).toString("hex")

  // Save the challenge and the associated address in Redis. Will only save if
  // not already set. Set the challenge to expire after 30 minutes.
  await redisClient.set(`address:${address}:challenge`, challenge, {
    EX: 1800,
    NX: true,
  })
  console.log({ challenge, difficulty: DIFFICULTY })
  res.status(200).send({ challenge, difficulty: DIFFICULTY })
})

app.post("/verify", async (req: Request, res: Response) => {
  const { address, captchaToken, solution, nonce } = req.body

  const validCaptcha = await checkCaptcha(captchaToken).catch((e) =>
    res.status(400).send(e.message)
  )

  if (validCaptcha) {
    console.log("GOOD TOKEN")
  } else {
    console.log("BAD TOKEN")
    res.status(500).send({ status: "ERROR", message: "Captcha error" })
    return
  }

  const challenge = await redisClient.get(`address:${address}:challenge`)
  console.log({ address, solution, nonce })
  // Validate the solution by checking that the SHA-256 hash of the challenge concatenated with the nonce
  // starts with a certain number of zeroes (the difficulty)
  const hash = crypto
    .createHash("sha256")
    .update(`${challenge}:${nonce}`)
    .digest("hex")

  console.log({ hash })

  const difficulty = DIFFICULTY // Adjust this value to change the difficulty of the PoW
  if (hash === solution && hash.startsWith("0".repeat(difficulty))) {
    // The solution is correct
    // Here is where you would send the tez to the user's address
    // For the sake of this example, we're just logging the address
    console.log(`Send tez to ${address}`)
    // responseBody.txHash = await send(amount, address)

    // Delete the challenge from Redis
    await redisClient.del(`address:${address}:challenge`)

    res.status(200).send({ status: "SUCCESS", message: "Tez sent" })
  } else {
    // The solution is incorrect
    res.status(400).send({ status: "ERROR", message: "Incorrect solution" })
  }
})

const port: number = process.env.API_PORT || defaultPort

app.listen(port, async () => {
  console.log(`Start API on port ${port}.`)
  await redisClient.connect()
  console.log("Connected to redis.")
})
