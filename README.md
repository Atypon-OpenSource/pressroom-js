# pressroom-js

A web service for manuscript conversion.

## Running in Docker

1. `docker-compose up --build`
2. Open http://0.0.0.0:5000/docs/

## Running in macOS

1. `brew install pandoc pandoc-citeproc`
2. `brew cask install --no-quarantine prince`
3. `yarn global add mathjax-pandoc-filter`
4. `yarn dev`
