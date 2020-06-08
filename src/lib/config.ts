const environmentVariable = (name: string): string => {
  const value = process.env[name]

  if (value === undefined || value === '') {
    throw new Error(`Missing environment variable ${name}`)
  }

  return value
}

interface Config {
  api_key: string
  arc: {
    api_key: string
    password: string
    username: string
  }
  couchbase: {
    bucket: string
    connection: string
    password: string
    username: string
  }
  gaia: {
    url: string
  }
  jwt: {
    issuer: string
    root: string
  }
}

export const config: Config = {
  api_key: environmentVariable('PRESSROOM_API_KEY'),
  arc: {
    api_key: environmentVariable('PRESSROOM_ARC_API_KEY'),
    password: environmentVariable('PRESSROOM_ARC_PASSWORD'),
    username: environmentVariable('PRESSROOM_ARC_USERNAME'),
  },
  couchbase: {
    bucket: environmentVariable('PRESSROOM_COUCHBASE_BUCKET'),
    connection: environmentVariable('PRESSROOM_COUCHBASE_CONNECTION'),
    password: environmentVariable('PRESSROOM_COUCHBASE_PASS'),
    username: environmentVariable('PRESSROOM_COUCHBASE_USER'),
  },
  gaia: {
    url: environmentVariable('PRESSROOM_GAIA_URL'),
  },
  jwt: {
    issuer: environmentVariable('PRESSROOM_JWT_ISSUER'),
    root: environmentVariable('PRESSROOM_JWT_ROOT'),
  },
}
