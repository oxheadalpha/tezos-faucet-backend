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
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const crypto_1 = __importDefault(require("crypto"));
const redis_1 = require("redis");
const Types_1 = require("./Types");
const Captcha_1 = require("./Captcha");
const Tezos_1 = require("./Tezos");
dotenv_1.default.config();
const redisClient = (0, redis_1.createClient)({
// url: "redis://localhost:6379",
}); // reject
redisClient.on("error", (err) => console.log("Redis Client Error", err));
const defaultPort = 3000;
const defaultUserAmount = 1;
const defaultBakerAmount = 6000;
const app = (0, express_1.default)();
app.use(body_parser_1.default.json());
app.use(body_parser_1.default.urlencoded({ extended: true }));
app.use((0, morgan_1.default)("dev"));
app.use((req, res, next) => {
    const cors = process.env.AUTHORIZED_HOST || "*";
    res.setHeader("Access-Control-Allow-Origin", cors);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
app.get("/info", (_, res) => {
    console.log("Get info");
    try {
        let profiles = {
            user: {
                profile: Types_1.Profile.USER,
                amount: process.env.FAUCET_AMOUNT_USER || defaultUserAmount,
                currency: "tez",
            },
            baker: {
                profile: Types_1.Profile.BAKER,
                amount: process.env.FAUCET_AMOUNT_BAKER || defaultBakerAmount,
                currency: "tez",
            },
        };
        let info = {
            faucetAddress: process.env.FAUCET_ADDRESS,
            captchaEnable: JSON.parse(process.env.ENABLE_CAPTCHA),
            profiles: profiles,
            maxBalance: process.env.MAX_BALANCE,
        };
        res.status(200);
        res.send(info);
    }
    catch (error) {
        res.status(400);
        res.send("Exception");
    }
});
const DIFFICULTY = 4;
app.post("/challenge", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { address, captchaToken, profile } = req.body;
    console.log(req.body);
    const validCaptcha = yield (0, Captcha_1.checkCaptcha)(captchaToken).catch((e) => res.status(400).send(e.message));
    if (validCaptcha) {
        console.log("GOOD TOKEN");
    }
    else {
        console.log("BAD TOKEN");
        res.status(400).send({ status: "ERROR", message: "Captcha error" });
        return;
    }
    if (!address) {
        res.status(400).send("The address property is required.");
        return;
    }
    try {
        (0, Tezos_1.getTezAmountForProfile)(profile);
    }
    catch (e) {
        res.status(400).send({ status: "ERROR", message: e.message });
        return;
    }
    // Generate or return existing PoW challenge.
    const challenge = (yield redisClient.get(`address:${address}:challenge`)) ||
        crypto_1.default.randomBytes(32).toString("hex");
    // const challenge = crypto.randomBytes(32).toString("hex")
    // Save the challenge and the associated address in Redis. Will only save if
    // not already set. Set the challenge to expire after 30 minutes.
    yield redisClient.set(`address:${address}:challenge`, challenge, {
        EX: 1800,
        NX: true,
    });
    console.log({ challenge, difficulty: DIFFICULTY });
    res.status(200).send({ challenge, difficulty: DIFFICULTY });
}));
app.post("/verify", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { address, captchaToken, solution, nonce } = req.body;
    const validCaptcha = yield (0, Captcha_1.checkCaptcha)(captchaToken).catch((e) => res.status(400).send(e.message));
    if (validCaptcha) {
        console.log("GOOD TOKEN");
    }
    else {
        console.log("BAD TOKEN");
        res.status(500).send({ status: "ERROR", message: "Captcha error" });
        return;
    }
    const challenge = yield redisClient.get(`address:${address}:challenge`);
    console.log({ address, solution, nonce });
    // Validate the solution by checking that the SHA-256 hash of the challenge concatenated with the nonce
    // starts with a certain number of zeroes (the difficulty)
    const hash = crypto_1.default
        .createHash("sha256")
        .update(`${challenge}:${nonce}`)
        .digest("hex");
    console.log({ hash });
    const difficulty = DIFFICULTY; // Adjust this value to change the difficulty of the PoW
    if (hash === solution && hash.startsWith("0".repeat(difficulty))) {
        // The solution is correct
        // Here is where you would send the tez to the user's address
        // For the sake of this example, we're just logging the address
        console.log(`Send tez to ${address}`);
        // responseBody.txHash = await send(amount, address)
        // Delete the challenge from Redis
        yield redisClient.del(`address:${address}:challenge`);
        res.status(200).send({ status: "SUCCESS", message: "Tez sent" });
    }
    else {
        // The solution is incorrect
        res.status(400).send({ status: "ERROR", message: "Incorrect solution" });
    }
}));
const port = process.env.API_PORT || defaultPort;
app.listen(port, () => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`Start API on port ${port}.`);
    yield redisClient.connect();
    console.log("Connected to redis.");
}));
