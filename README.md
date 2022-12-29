# pressroom-js

A web service for manuscript conversion.

## Building a Docker image

To build a Docker image, run the following command in the repository root: `docker build . -f docker/pressroom-full/Dockerfile`

## Development

1. Copy `.env.example` to `.env` and edit the values as needed.
2. In the repository root, run `pnpm --filter pressroom-js dev`

## OpenAPI

* The API documentation is served at `/api/v2/docs`.
* TBF

## PDF themes & Citation styles
...
