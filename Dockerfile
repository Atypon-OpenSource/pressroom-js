FROM registry.gitlab.com/mpapp-public/pressroom-base/master:2d9b01b2c36e4a66babb8f5ada35bc07f07392c9

WORKDIR /usr/src/app

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile --non-interactive

COPY . .

RUN yarn build

EXPOSE 5000

CMD [ "node", "dist/server.js" ]

HEALTHCHECK --interval=5m --timeout=3s CMD curl --fail http://localhost/ || exit 1


