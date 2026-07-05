/** Mongo database name for Destiny Top Nest (separate from SDHQCC). */
export function getMongoDbName(): string {
  return process.env.MONGODB_DB_NAME?.trim() || 'destinytopnest'
}
