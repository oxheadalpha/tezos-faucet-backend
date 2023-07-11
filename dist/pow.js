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
exports.verifySolution = exports.getChallenge = exports.saveChallenge = exports.generateChallenge = exports.getChallengeKey = void 0;
const crypto_1 = require("crypto");
const getChallengeKey = (address) => `address:${address}`;
exports.getChallengeKey = getChallengeKey;
const generateChallenge = (bytesSize = 32) => (0, crypto_1.randomBytes)(bytesSize).toString("hex");
exports.generateChallenge = generateChallenge;
const saveChallenge = (redis, { challenge, challengeKey, counter, expiration = 1800, // 30m
 }) => __awaiter(void 0, void 0, void 0, function* () {
    yield redis.hSet(challengeKey, {
        challenge,
        counter,
    });
    yield redis.expire(challengeKey, expiration);
});
exports.saveChallenge = saveChallenge;
const getChallenge = (redis, challengeKey) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield redis.hGetAll(challengeKey);
    return Object.assign(Object.assign({}, data), (data.counter && { counter: Number(data.counter) }));
});
exports.getChallenge = getChallenge;
const getSolution = (challenge, nonce) => (0, crypto_1.createHash)("sha256").update(`${challenge}:${nonce}`).digest("hex");
const verifySolution = ({ challenge, difficulty, nonce, solution, }) => {
    const hash = getSolution(challenge, nonce);
    return hash === solution && hash.startsWith("0".repeat(difficulty) + "8");
};
exports.verifySolution = verifySolution;
