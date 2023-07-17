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
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifySolution = exports.getChallenge = exports.saveChallenge = exports.createChallenge = exports.getChallengeKey = void 0;
const crypto_1 = require("crypto");
const api_1 = require("./api");
const getChallengeKey = (address) => `address:${address}`;
exports.getChallengeKey = getChallengeKey;
const determineDifficulty = () => {
    const challengeSize = 32;
    const difficulty = 4;
    return { challengeSize, difficulty };
};
const generateChallenge = (bytesSize = 32) => (0, crypto_1.randomBytes)(bytesSize).toString("hex");
const createChallenge = () => {
    const { challengeSize, difficulty } = determineDifficulty();
    const challenge = generateChallenge(challengeSize);
    return { challenge, difficulty };
};
exports.createChallenge = createChallenge;
const saveChallenge = ({ challenge, challengeKey, counter, difficulty, expiration = 1800, // 30m
usedCaptcha, }) => __awaiter(void 0, void 0, void 0, function* () {
    yield api_1.redis.hSet(challengeKey, Object.assign({ challenge,
        counter,
        difficulty }, (typeof usedCaptcha === "boolean" && {
        usedCaptcha: String(usedCaptcha),
    })));
    yield api_1.redis.expire(challengeKey, expiration);
});
exports.saveChallenge = saveChallenge;
const getChallenge = (challengeKey) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield api_1.redis.hGetAll(challengeKey);
    if (!Object.keys(data).length)
        return null;
    return Object.assign(Object.assign({}, data), { counter: Number(data.counter), difficulty: Number(data.difficulty), usedCaptcha: data.usedCaptcha === "true" });
});
exports.getChallenge = getChallenge;
const getSolution = (challenge, nonce) => (0, crypto_1.createHash)("sha256").update(`${challenge}:${nonce}`).digest("hex");
const verifySolution = ({ challenge, difficulty, nonce, solution, }) => {
    const hash = getSolution(challenge, nonce);
    return hash === solution && hash.startsWith("0".repeat(difficulty) + "8");
};
exports.verifySolution = verifySolution;
