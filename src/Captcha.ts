import axios from "axios"
import { Response } from "express"

export const CAPTCHA_ENABLED = process.env.ENABLE_CAPTCHA !== "false"

export const validateCaptcha = async (res: Response, captchaToken: string) => {
  try {
    if (!CAPTCHA_ENABLED) {
      console.log("Captcha disabled")
      return true
    }

    if (!captchaToken) {
      throw new Error("Missing captcha token.")
    }

    const captchaURL = `https://google.com/recaptcha/api/siteverify`

    const res = (
      await axios.post(
        captchaURL,
        {},
        {
          params: {
            secret: process.env.FAUCET_CAPTCHA_SECRET,
            response: captchaToken,
          },
        }
      )
    ).data

    if (!res.success) {
      res.status(400).send({ status: "ERROR", message: "Invalid captcha" })
      return false
    }
  } catch (err) {
    console.error(err)
    res.status(400).send({ status: "ERROR", message: "Captcha error" })
    return false
  }

  return true
}
