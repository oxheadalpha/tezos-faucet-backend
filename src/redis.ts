import { createClient } from "redis"

const redis = createClient({
  url: process.env.REDIS_URL,
  password: process.env.REDIS_PASSWORD,
})
  .on("connect", () => console.log("Connected to redis."))
  .on("error", (err: any) => console.error("Redis Client Error:", err))

export default redis
