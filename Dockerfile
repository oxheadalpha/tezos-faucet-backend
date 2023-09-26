FROM node:18-alpine

USER node

WORKDIR /app

RUN chown node:node /app

COPY --chown=node:node package.json ./
COPY --chown=node:node package-lock.json ./

RUN npm install

COPY --chown=node:node . ./

RUN ./node_modules/typescript/bin/tsc

# https://expressjs.com/en/advanced/best-practice-performance.html#set-node_env-to-production
ENV NODE_ENV=production

CMD ["node", "--enable-source-maps", "./dist/src/api.js"]
