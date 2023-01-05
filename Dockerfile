FROM node:18-alpine

WORKDIR /app

COPY . .

RUN npm ci --only=production

RUN apk update && apk add bash vim dumb-init

CMD [ "dumb-init", "node", "app.mjs" ]
