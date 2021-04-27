FROM registry.gitlab.com/mpapp-public/pressroom-base/master:2fd007ebb12f1d7ce3a90e3282a26195d93cc4b7 as builder
WORKDIR /usr/src/app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --non-interactive

COPY . .
RUN yarn lint
#RUN yarn test
RUN yarn build

RUN npm prune --production

FROM registry.gitlab.com/mpapp-public/pressroom-base/master:2fd007ebb12f1d7ce3a90e3282a26195d93cc4b7
WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
RUN cp -r node_modules/@manuscripts/themes/themes dist/assets/


EXPOSE 5000
CMD [ "node", "dist/server.js" ]
HEALTHCHECK --interval=5m --timeout=3s CMD curl --fail http://localhost/ || exit 1


