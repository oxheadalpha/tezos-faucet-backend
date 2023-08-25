import { Request, Response, NextFunction } from "express"
import winston from "winston"

const httpWinstonLogger = winston.createLogger({
  level: "http",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(
      ({
        timestamp,
        message: { method, url, status, responseTime, address, profile },
      }) =>
        `${timestamp} ${method?.padEnd(7)} ${url?.padEnd(10)} ${status} ${(
          responseTime + "ms"
        ).padEnd(5)} ${address} ${profile.toUpperCase()}`
    )
  ),
  transports: [new winston.transports.Console()],
})

export const httpLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now()
  res.on("finish", () => {
    const responseTime = Date.now() - start
    const logEntry = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      responseTime,
      // Don't log an entire really long random string a user could send.
      address: req?.body?.address?.slice(0, 36) || "-",
      profile: req?.body?.profile?.slice(0, 5) || "-",
    }
    httpWinstonLogger.http(logEntry)
  })
  next()
}
