FROM node:boron-alpine

MAINTAINER Dean Sheather <dean@deansheather.com>

# copy source files into container
COPY app.js src/
COPY config.json src/
COPY package.json src/
COPY lib/ src/lib
COPY routes/ src/routes

WORKDIR src/

# install NPM dependencies
RUN npm install --production

# expose port 80
ENV PORT=80
EXPOSE 80

# start the consumer
CMD ["node", "app.js"]
