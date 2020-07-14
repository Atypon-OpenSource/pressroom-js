# pressroom-js

A web service for manuscript conversion.

## Running in Docker

1. `docker-compose up --build`
2. Open http://0.0.0.0:5000/ to check the status
2. Open http://0.0.0.0:5000/api/v2/docs/ to view the docs

## Running in macOS

1. `brew install pandoc pandoc-citeproc`
1. `brew install latexml`
1. `brew install bibutils`
1. `brew install tectonic`
1. `brew cask install basictex`
1. `brew cask install --no-quarantine prince`
1. `brew install python3 cairo pango gdk-pixbuf libffi && pip3 install WeasyPrint`
1. `yarn global add @manuscripts/mathjax-filter`
1. `gem install anystyle-cli`
1. `yarn dev`
