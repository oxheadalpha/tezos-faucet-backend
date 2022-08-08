import express, { Express, Request, Response } from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

import { Profile, RequestBody, ResponseBody, InfoResponseBody } from './Types';
import { checkCaptcha } from './Captcha';
import { send } from './Tezos';

dotenv.config();

const defaultPort: number = 3000;
const defaultUserAmount: number = 1;
const defaultBakerAmount: number = 6000;

const app: Express = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


app.use((req: Request, res: Response, next) => {

    const cors: string = process.env.AUTHORIZED_HOST || '*';
    res.setHeader("Access-Control-Allow-Origin", cors); 
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    next();
});

app.get('/info', (_, res: Response) => {

    console.log('Get info');

    let profiles: any = {
        user: {
            profile: Profile.USER,
            amount: process.env.FAUCET_AMOUNT_USER || defaultUserAmount,
            currency: "tez"
        },
        baker: {
            profile: Profile.BAKER,
            amount: process.env.FAUCET_AMOUNT_BAKER || defaultBakerAmount,
            currency: "tez"
        }
    };

    let info: InfoResponseBody = {
        faucetAddress: process.env.FAUCET_ADDRESS,
        captchaEnable: JSON.parse(process.env.ENABLE_CAPTCHA),
        profiles: profiles,
        maxBalance: process.env.MAX_BALANCE
    };

    res.status(200);
    res.send(info);
});

app.post('/send', async (req: Request, res: Response) => {

    const body: RequestBody = req.body;

    const { captchaToken: captchaToken, address: address, profile: profile } = body;

    let responseBody: ResponseBody = {
        status: '',
        message: undefined,
        txHash: undefined
    };

    let amount: number = 0;

    switch (profile) {
        case Profile.USER:
            amount = process.env.FAUCET_AMOUNT_USER || defaultUserAmount;
            break;
        case Profile.BAKER:
            amount = process.env.FAUCET_AMOUNT_BAKER || defaultBakerAmount;
            break;
        default:
            console.log(`Unknown profile ${profile}`);
            responseBody.status = "ERROR";
            responseBody.message = `Unknown profile`;
            res.status(400);
            res.send(responseBody);
            return;
    }

    console.log(`Try to send ${amount} xtz to ${address}, with captcha token ${captchaToken}`);

    if (await checkCaptcha(captchaToken)) {

        try {
            responseBody.txHash = await send(amount, address);
            responseBody.status = "SUCCESS";
            res.status(200);
        }
        catch (error) {
            responseBody.message = `${error}`;
            responseBody.status = "ERROR";
            res.status(500);
        }
    }
    else {
        responseBody.status = "ERROR";
        responseBody.message = `Captcha error`;
        res.status(400);
    }

    res.send(responseBody);
});

const port: number = process.env.API_PORT || defaultPort;

app.listen(port, () => {
    console.log(`Start API on port ${port}.`);
});