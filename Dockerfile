FROM node:14-alpine3.15

WORKDIR /usr/ep-api

RUN apk update && apk upgrade
RUN yarn
RUN yarn global add pm2

CMD ["pm2-runtime", "ecosystem.config.js", "--only", "ep-api"]