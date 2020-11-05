FROM registry.gitlab.com/mpapp-public/pressroom-base/master:622d44ae18a260d28ec73fee570e238a67783733 as builder
WORKDIR /usr/src/app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --non-interactive

COPY . .
RUN yarn lint
#RUN yarn test
RUN yarn build

RUN npm prune --production

FROM registry.gitlab.com/mpapp-public/pressroom-base/master:622d44ae18a260d28ec73fee570e238a67783733
WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules

EXPOSE 5000
CMD [ "node", "dist/server.js" ]
HEALTHCHECK --interval=5m --timeout=3s CMD curl --fail http://localhost/ || exit 1


