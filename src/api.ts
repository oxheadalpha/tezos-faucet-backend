import express, { Express, Request, Response } from "express"
import bodyParser from "body-parser"
import morgan from "morgan"
import dotenv from "dotenv"
import createVdf from "@subspace/vdf"

import { Profile, RequestBody, ResponseBody, InfoResponseBody } from "./Types"
import { checkCaptcha } from "./Captcha"
import { send } from "./Tezos"
import { randomBytes } from "crypto"
import { log } from "console"

dotenv.config()

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

// createVdf().then((vdfInstance: any) => {
//   const iterations = 3
//   const challenge = Buffer.from("aa", "hex")
//   const intSizeBits = 2048
//   // const intSizeBits = 100;
//   const isPietrzak = false
//   const res = vdfInstance.generate(
//     iterations,
//     challenge,
//     intSizeBits,
//     isPietrzak
//   )
//   // console.log(res)
//   console.log(Buffer.from(res).toString("hex"))
//   console.log(vdfInstance.verify(3, challenge, res, intSizeBits, isPietrzak))
// })


app.get("/info", (_, res: Response) => {
  console.log("Get info")

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
})

app.post("/send", async (req: Request, res: Response) => {
  const body: RequestBody = req.body

  const { captchaToken, address, profile } = body

  const responseBody: any = {
    status: "",
    message: undefined,
    txHash: undefined,
    vdfChallenge: "",
  }

  let amount: number = 0

  switch (profile) {
    case Profile.USER:
      amount = process.env.FAUCET_AMOUNT_USER || defaultUserAmount
      break
    case Profile.BAKER:
      amount = process.env.FAUCET_AMOUNT_BAKER || defaultBakerAmount
      break
    default:
      console.log(`Unknown profile ${profile}`)
      responseBody.status = "ERROR"
      responseBody.message = `Unknown profile`
      res.status(400)
      res.send(responseBody)
      return
  }

  // console.log(
  //   `Try to send ${amount} xtz to ${address}, with captcha token ${captchaToken}`
  // )

  const discriminant_challenge = randomBytes(10)
  console.log({
    discriminant_challenge: Buffer.from(discriminant_challenge).toString("hex"),
  })

  responseBody.status = "SUCCESS"
  responseBody.vdfChallenge = {
    challenge: discriminant_challenge,
    // challenge: "adfdafaafas329084dfadf",
    iterations: 10000,
    // size: 512,
    size: 2048,
  }
  res.status(200)
  res.send(responseBody)
  return

  if (await checkCaptcha(captchaToken)) {
    try {
      responseBody.txHash = await send(amount, address)
      responseBody.status = "SUCCESS"
      res.status(200)
    } catch (error) {
      responseBody.message = `${error}`
      responseBody.status = "ERROR"
      res.status(500)
    }
  } else {
    responseBody.status = "ERROR"
    responseBody.message = `Captcha error`
    res.status(400)
  }

  res.send(responseBody)
})

const vdf = createVdf()

app.post("/verify", async (req: Request, res: Response) => {
  const body: any = req.body
  // const body: VerificationRequestBody = req.body

  const { challenge, iterations, size, solution, profile, address } = body
  // console.log({ solution: Buffer.from(solution, "hex") })
  let responseBody: ResponseBody = {
    status: "",
    message: undefined,
    txHash: undefined,
  }

  // Verify the solution (use the VDF library's verify method)
  const v = await vdf
  // console.log({ v })
  let solutionBuffer = Buffer.from(solution, "base64")
  // console.log({ bufferFromSolution: Buffer.from(solution) })
  // let uint8Array = new Uint8Array(buffer)
  console.log({ solutionBuffer, challenge, size, iterations })
  console.log(solutionBuffer.toString("hex"))
  const isValid = v.verify(iterations, challenge, solutionBuffer, size, false)
  console.log({isValid})
  if (isValid) {
    let amount: number = 0

    switch (profile) {
      case Profile.USER:
        amount = process.env.FAUCET_AMOUNT_USER || defaultUserAmount
        break
      case Profile.BAKER:
        amount = process.env.FAUCET_AMOUNT_BAKER || defaultBakerAmount
        break
      default:
        console.log(`Unknown profile ${profile}`)
        responseBody.status = "ERROR"
        responseBody.message = `Unknown profile`
        res.status(400)
        res.send(responseBody)
        return
    }
    try {
      responseBody.txHash = await send(amount, address)
      responseBody.status = "SUCCESS"
      res.status(200)
    } catch (error) {
      responseBody.message = `${error}`
      responseBody.status = "ERROR"
      res.status(500)
    }
  } else {
    responseBody.status = "ERROR"
    responseBody.message = `Invalid solution`
    res.status(400)
  }

  res.send(responseBody)
})

const port: number = process.env.API_PORT || defaultPort

app.listen(port, () => {
  console.log(`Start API on port ${port}.`)
})
