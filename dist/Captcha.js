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
exports.validateCaptcha = void 0;
const axios_1 = __importDefault(require("axios"));
const checkCaptcha = (responseToken) => __awaiter(void 0, void 0, void 0, function* () {
    if (!responseToken) {
        throw new Error("Missing captcha token.");
    }
    const enableCaptcha = process.env.ENABLE_CAPTCHA || "true";
    if (enableCaptcha === "false") {
        console.log("Captcha disabled");
        return true;
    }
    const secret = process.env.FAUCET_CAPTCHA_SECRET;
    const captchaURL = `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${responseToken}`;
    const res = yield axios_1.default.post(captchaURL);
    return res.data;
});
const validateCaptcha = (res, captchaToken) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield checkCaptcha(captchaToken);
        console.log(response);
        if (!response.success) {
            res.status(400).send({ status: "ERROR", message: "Invalid captcha" });
            return false;
        }
    }
    catch (err) {
        res.status(400).send({ status: "ERROR", message: "Captcha error" });
        return false;
    }
    return true;
});
exports.validateCaptcha = validateCaptcha;
