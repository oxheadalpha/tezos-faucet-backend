import axios from 'axios';

const checkCaptcha = async (responseToken: string) => {

    const enableCaptcha: string = process.env.ENABLE_CAPTCHA || "true";

    if (enableCaptcha === "false") {
        console.log("Captcha disabled");
        return true;
    }

    const secret = process.env.FAUCET_CAPTCHA_SECRET;
    const captchaURL = `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${responseToken}`;

    const res = await axios.post(captchaURL);
    console.log(res.data);

    return res.data.success;
};


export { checkCaptcha };