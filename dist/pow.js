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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifySolution = exports.getChallenge = exports.saveChallenge = exports.createChallenge = exports.getChallengeKey = void 0;
const crypto_1 = require("crypto");
const api_1 = require("./api");
const getChallengeKey = (address) => `address:${address}`;
exports.getChallengeKey = getChallengeKey;
// TODO: Implement
const determineDifficulty = () => {
    const challengeSize = 32;
    const difficulty = 4;
    return { challengeSize, difficulty };
};
// TODO: Implement
const determineChallengesNeeded = (usedCaptcha) => usedCaptcha ? 2 : 4;
const generateChallenge = (bytesSize = 32) => (0, crypto_1.randomBytes)(bytesSize).toString("hex");
const createChallenge = (usedCaptcha) => {
    const { challengeSize, difficulty } = determineDifficulty();
    const challengesNeeded = determineChallengesNeeded(usedCaptcha);
    const challenge = generateChallenge(challengeSize);
    return { challenge, challengesNeeded, difficulty };
};
exports.createChallenge = createChallenge;
const saveChallenge = (challengeKey, _a) => __awaiter(void 0, void 0, void 0, function* () {
    var { usedCaptcha, expiration = 1800 } = _a, // 30m
    args = __rest(_a, ["usedCaptcha", "expiration"]);
    yield api_1.redis.hSet(challengeKey, Object.assign(Object.assign({}, args), (typeof usedCaptcha === "boolean" && {
        usedCaptcha: String(usedCaptcha),
    })));
    yield api_1.redis.expire(challengeKey, expiration);
});
exports.saveChallenge = saveChallenge;
const getChallenge = (challengeKey) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield api_1.redis.hGetAll(challengeKey);
    if (!Object.keys(data).length)
        return null;
    return Object.assign(Object.assign({}, data), { challengesNeeded: Number(data.challengesNeeded), counter: Number(data.counter), difficulty: Number(data.difficulty), usedCaptcha: data.usedCaptcha === "true" });
});
exports.getChallenge = getChallenge;
const getSolution = (challenge, nonce) => (0, crypto_1.createHash)("sha256").update(`${challenge}:${nonce}`).digest("hex");
const verifySolution = ({ challenge, difficulty, nonce, solution, }) => {
    const hash = getSolution(challenge, nonce);
    // Validate the SHA-256 hash of the challenge concatenated with the nonce
    // starts with a certain number of zeroes (the difficulty).
    return hash === solution && hash.startsWith("0".repeat(difficulty) + "8");
};
exports.verifySolution = verifySolution;
