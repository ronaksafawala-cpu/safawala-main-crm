import pg from "pg"

const { Client } = pg

const required = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_DB_PASSWORD", "DATABASE_URL"]
for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`)
}

const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
const projectRef = supabaseUrl.hostname.split(".")[0]
const sourceHost = process.env.SUPABASE_DB_HOST || "aws-0-ap-south-1.pooler.supabase.com"
const sourceUser = process.env.SUPABASE_DB_USER || `postgres.${projectRef}`
const sourcePort = process.env.SUPABASE_DB_PORT || "5432"
const sourceDatabase = process.env.SUPABASE_DB_NAME || "postgres"
const sourceUrl = `postgresql://${encodeURIComponent(sourceUser)}:${encodeURIComponent(process.env.SUPABASE_DB_PASSWORD)}@${sourceHost}:${sourcePort}/${sourceDatabase}`

const source = new Client({ connectionString: sourceUrl, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 })
const destination = new Client({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined, connectionTimeoutMillis: 15000 })

const quote = (value) => `"${String(value).replaceAll('"', '""')}"`
const tableName = (schema, name) => `${quote(schema)}.${quote(name)}`

function destinationType(sourceType) {
  const type = String(sourceType).toLowerCase()
  if (type.startsWith("_") || type.includes("[]")) return "jsonb"
  if (["uuid", "boolean", "date", "time without time zone", "time with time zone", "timestamp without time zone", "timestamp with time zone", "interval", "json", "jsonb", "bytea", "smallint", "integer", "bigint", "real", "double precision", "numeric", "decimal", "text", "character varying", "character", "citext"].includes(type)) {
    return type === "json" ? "jsonb" : type
  }
  return "text"
}

function stableJson(value) {
  if (value === null || value === undefined) return "null"
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`
  if (typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`
  return JSON.stringify(value)
}

function normalizeValue(value, type) {
  if (value === undefined) return null
  if (type === "jsonb" && value !== null && typeof value !== "string") return JSON.stringify(value)
  if (type === "jsonb" && typeof value === "string") {
    try { JSON.parse(value); return value } catch { return JSON.stringify(value) }
  }
  return value
}

async function getTables() {
  const result = await source.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `)
  return result.rows.map((row) => row.table_name)
}

async function getColumns(name) {
  const result = await source.query(`
    SELECT a.attname AS column_name,
           format_type(a.atttypid, a.atttypmod) AS source_type,
           a.attnotnull AS not_null,
           a.attgenerated AS generated
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = $1 AND a.attnum > 0 AND NOT a.attisdropped
    ORDER BY a.attnum
  `, [name])
  return result.rows.filter((row) => row.generated !== "s")
}

async function getPrimaryKey(name) {
  const result = await source.query(`
    SELECT a.attname AS column_name
    FROM pg_index i
    JOIN pg_class c ON c.oid = i.indrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS keys(attnum, ord) ON true
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = keys.attnum
    WHERE n.nspname = 'public' AND c.relname = $1 AND i.indisprimary
    ORDER BY keys.ord
  `, [name])
  return result.rows.map((row) => row.column_name)
}

async function ensureTable(name, columns, primaryKey) {
  const definitions = columns.map((column) => {
    const type = destinationType(column.source_type)
    return `${quote(column.column_name)} ${type}${column.not_null ? " NOT NULL" : ""}`
  })
  if (!primaryKey.length) definitions.push(`${quote("__supabase_sync_hash")} text`)
  if (primaryKey.length) definitions.push(`PRIMARY KEY (${primaryKey.map(quote).join(", ")})`)
  await destination.query(`CREATE TABLE IF NOT EXISTS ${tableName("public", name)} (${definitions.join(", ")})`)
}

async function syncTable(name) {
  const columns = await getColumns(name)
  if (!columns.length) return { table: name, rows: 0 }
  const primaryKey = await getPrimaryKey(name)
  await ensureTable(name, columns, primaryKey)

  const names = columns.map((column) => column.column_name)
  const types = columns.map((column) => destinationType(column.source_type))
  const selectColumns = names.map(quote).join(", ")
  const sourceRows = await source.query(`SELECT ${selectColumns} FROM ${tableName("public", name)}`)
  if (!sourceRows.rows.length) return { table: name, rows: 0 }

  const updateColumns = names.filter((column) => !primaryKey.includes(column))
  const hashColumn = primaryKey.length ? null : "__supabase_sync_hash"
  const insertColumns = [...names, ...(hashColumn ? [hashColumn] : [])]
  const conflict = primaryKey.length
    ? `ON CONFLICT (${primaryKey.map(quote).join(", ")}) DO UPDATE SET ${updateColumns.length ? updateColumns.map((column) => `${quote(column)} = EXCLUDED.${quote(column)}`).join(", ") : `${quote(primaryKey[0])} = EXCLUDED.${quote(primaryKey[0])}`}`
    : `ON CONFLICT (${quote(hashColumn)}) DO UPDATE SET ${names.length ? names.map((column) => `${quote(column)} = EXCLUDED.${quote(column)}`).join(", ") : `${quote(hashColumn)} = EXCLUDED.${quote(hashColumn)}`}`

  let synced = 0
  for (const row of sourceRows.rows) {
    const values = names.map((column, index) => normalizeValue(row[column], types[index]))
    if (hashColumn) values.push(stableJson(row))
    const placeholders = values.map((_, index) => `$${index + 1}`).join(", ")
    await destination.query(`INSERT INTO ${tableName("public", name)} (${insertColumns.map(quote).join(", ")}) VALUES (${placeholders}) ${conflict}`, values)
    synced += 1
  }
  return { table: name, rows: synced }
}

async function main() {
  await source.connect()
  await destination.connect()
  const tables = await getTables()
  const results = []
  for (const table of tables) {
    try { results.push(await syncTable(table)) }
    catch (error) { results.push({ table, error: error instanceof Error ? error.message : String(error) }) }
  }
  console.log(JSON.stringify({ source: supabaseUrl.origin, tables: results }, null, 2))
}

try { await main() }
finally { await Promise.allSettled([source.end(), destination.end()]) }
