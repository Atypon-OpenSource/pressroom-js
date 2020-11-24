# pressroom-js

A web service for manuscript conversion.

## Upgrading pressroom-base

The `pressroom-base` Docker image tag is referenced in 3 places: twice in `Dockerfile` and once in `gitlab-ci.yml`. To upgrade the base image replace the image tag in all these places with the latest image tag (which is the latest commit hash on the `pressroom-base` master branch).

## Running in Docker

1. `docker-compose up --build`
2. Open http://0.0.0.0:5000/ to check the status
2. Open http://0.0.0.0:5000/api/v2/docs/ to view the docs

## Running in macOS

1. `brew install pandoc`
1. `brew install latexml`
1. `brew install bibutils`
1. `brew install tectonic`
1. `brew cask install basictex`
1. `brew cask install --no-quarantine prince`
1. `brew install python3 cairo pango gdk-pixbuf libffi && pip3 install WeasyPrint`
1. `yarn global add @manuscripts/mathjax-filter`
1. `gem install anystyle-cli`
1. `yarn dev`

## Development

1. Copy `.env.example` to `.env` and edit the values as needed.
1. Run `yarn dev` to start the server with `nodemon`.

## Updating test snapshots in Docker

```sh
docker run --rm -it -v "$(pwd)":/app:delegated registry.gitlab.com/mpapp-public/pressroom-base/master:latest /bin/bash
cd /app
yarn install --force
yarn test -u
```

## OpenAPI

* The API documentation is served at `/api/v2/docs`. 
* After editing the Swagger documentation for a route, run `yarn build` to rebuild the `dist` folder, then restart the dev server to pick up the changes.
