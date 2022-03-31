FROM node:14-alpine3.15

WORKDIR /usr/ep-api

RUN apk update && apk upgrade

COPY package.json yarn.lock ./
RUN yarn

COPY . .

RUN yarn global add pm2

CMD ["pm2-runtime", "ecosystem.config.js", "--only", "ep-api"]