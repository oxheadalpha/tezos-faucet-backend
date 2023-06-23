import axios from "axios"

export const checkCaptcha = async (responseToken: string) => {
  if (!responseToken) {
    throw new Error("Missing captcha token.")
  }

  const enableCaptcha: string = process.env.ENABLE_CAPTCHA || "true"

  if (enableCaptcha === "false") {
    console.log("Captcha disabled")
    return true
  }

  const secret = process.env.FAUCET_CAPTCHA_SECRET

  const captchaURL = `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${responseToken}`

  const res = await axios.post(captchaURL)
  return res.data.success
}
