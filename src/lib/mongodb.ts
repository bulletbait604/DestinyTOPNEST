import { MongoClient } from 'mongodb'

const globalForMongo = globalThis as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>
}

/** Trim whitespace and strip accidental wrapping quotes from Vercel/console paste. */
export function normalizeMongoUri(raw: string | undefined): string {
  if (!raw?.trim()) {
    throw new Error('The database is not connected.')
  }

  let uri = raw.trim()
  if (
    (uri.startsWith('"') && uri.endsWith('"')) ||
    (uri.startsWith("'") && uri.endsWith("'"))
  ) {
    uri = uri.slice(1, -1).trim()
  }

  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    throw new Error(
      'The database address is not a valid connection string.'
    )
  }

  return uri
}

function connect(): Promise<MongoClient> {
  const uri = normalizeMongoUri(process.env.MONGODB_URI)
  const client = new MongoClient(uri, {
    /** Keep serverless instances from opening large pools (Atlas M0 ~500 conn cap). */
    maxPoolSize: 10,
    minPoolSize: 0,
    maxIdleTimeMS: 10_000,
    serverSelectionTimeoutMS: 10_000,
  })
  return client.connect()
}

function getClientPromise(): Promise<MongoClient> {
  if (!globalForMongo._mongoClientPromise) {
    globalForMongo._mongoClientPromise = connect()
  }
  return globalForMongo._mongoClientPromise
}

/** Lazy thenable — avoids MongoClient construction during `next build` import. */
const clientPromise: Promise<MongoClient> = {
  then(onFulfilled, onRejected) {
    return getClientPromise().then(onFulfilled, onRejected)
  },
  catch(onRejected) {
    return getClientPromise().catch(onRejected)
  },
  finally(onFinally) {
    return getClientPromise().finally(onFinally)
  },
} as Promise<MongoClient>

export default clientPromise
