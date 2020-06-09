FROM node:12-buster

RUN apt-get update

# https://www.princexml.com/download/
RUN curl 'https://www.princexml.com/download/prince_13.5-1_debian10_amd64.deb' -o prince.deb \
  && apt-get install -y ./prince.deb \
  && rm prince.deb

# https://github.com/jgm/pandoc/releases/latest
RUN curl -L 'https://github.com/jgm/pandoc/releases/download/2.9.2.1/pandoc-2.9.2.1-1-amd64.deb' -o pandoc.deb \
  && apt-get install -y ./pandoc.deb \
  && rm pandoc.deb

RUN yarn global add mathjax-pandoc-filter@^0.4.0

WORKDIR /usr/src/app

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile --non-interactive

COPY . .

RUN yarn build

EXPOSE 8080

CMD [ "node", "dist/server.js" ]

HEALTHCHECK --interval=5m --timeout=3s CMD curl --fail http://localhost/ || exit 1


