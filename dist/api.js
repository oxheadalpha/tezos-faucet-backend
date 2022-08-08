"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const Types_1 = require("./Types");
const Captcha_1 = require("./Captcha");
const Tezos_1 = require("./Tezos");
dotenv_1.default.config();
const defaultPort = 3000;
const defaultUserAmount = 1;
const defaultBakerAmount = 6000;
const app = (0, express_1.default)();
app.use(body_parser_1.default.json());
app.use(body_parser_1.default.urlencoded({ extended: true }));
app.use((req, res, next) => {
    const cors = process.env.AUTHORIZED_HOST || '*';
    res.setHeader("Access-Control-Allow-Origin", cors);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});
app.get('/info', (_, res) => {
    console.log('Get info');
    let profiles = {
        user: {
            profile: Types_1.Profile.USER,
            amount: process.env.FAUCET_AMOUNT_USER || defaultUserAmount,
            currency: "tez"
        },
        baker: {
            profile: Types_1.Profile.BAKER,
            amount: process.env.FAUCET_AMOUNT_BAKER || defaultBakerAmount,
            currency: "tez"
        }
    };
    let info = {
        faucetAddress: process.env.FAUCET_ADDRESS,
        captchaEnable: JSON.parse(process.env.ENABLE_CAPTCHA),
        profiles: profiles,
        maxBalance: process.env.MAX_BALANCE
    };
    res.status(200);
    res.send(info);
});
app.post('/send', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const body = req.body;
    const { captchaToken: captchaToken, address: address, profile: profile } = body;
    let responseBody = {
        status: '',
        message: undefined,
        txHash: undefined
    };
    let amount = 0;
    switch (profile) {
        case Types_1.Profile.USER:
            amount = process.env.FAUCET_AMOUNT_USER || defaultUserAmount;
            break;
        case Types_1.Profile.BAKER:
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
    if (yield (0, Captcha_1.checkCaptcha)(captchaToken)) {
        try {
            responseBody.txHash = yield (0, Tezos_1.send)(amount, address);
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
}));
const port = process.env.API_PORT || defaultPort;
app.listen(port, () => {
    console.log(`Start API on port ${port}.`);
});
