FROM node:iron-bullseye-slim as node

# build bibutils (https://sourceforge.net/projects/bibutils)
FROM node as build-bibutils
RUN apt update
RUN apt install -y build-essential curl
WORKDIR /bibutils
RUN curl -L 'https://versaweb.dl.sourceforge.net/project/bibutils/bibutils_7.2_src.tgz' | tar xvz --strip-components=1
RUN ./configure
RUN make deb
RUN mv ./update/bibutils-7.2_amd64.deb ./bibutils.deb

# build pressroom
FROM node as base
RUN apt update
# not sure why these are needed
RUN apt install -y --no-install-recommends libfontconfig1 libgraphite2-3 libharfbuzz0b libicu67 zlib1g libharfbuzz-icu0 libssl1.1 ca-certificates curl
# install bibutils
COPY --from=build-bibutils /bibutils/bibutils.deb ./bibutils.deb
RUN apt install -y ./bibutils.deb && rm ./bibutils.deb
# install prince
RUN curl -L 'https://www.princexml.com/download/prince_15-1_debian11_amd64.deb' -o prince.deb && apt install -y ./prince.deb && rm ./prince.deb

FROM base as build
RUN apt install -y python3-pip

WORKDIR /usr/src/app

COPY . .
RUN yarn install --frozen-lockfile --non-interactive
RUN yarn build

RUN yarn install --production

# build an image with only runnable code
FROM base
WORKDIR /app

COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/package.json ./package.json

EXPOSE 5000
CMD [ "node", "dist/server.js" ]
HEALTHCHECK --interval=5m --timeout=3s CMD curl --fail http://localhost/ || exit 1
