/**
 * Exécute un fichier .sql sur Postgres.
 * .env : SUPABASE_DB_PASSWORD ou SUPABASE_DATABASE_URL.
 *
 *   npm run db:run -- supabase/complete_setup.sql
 *
 * Si la connexion directe db.*.supabase.co échoue (IPv6 injoignable), bascule sur
 * le pooler Supabase (IPv4), en testant plusieurs régions AWS.
 */
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import dns from 'dns/promises'
import pg from 'pg'
import { parse as parseConn } from 'pg-connection-string'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

dotenv.config({ path: resolve(root, '.env') })
dotenv.config({ path: resolve(root, '.env.local') })

const POOLER_REGIONS = [
  'eu-central-1',
  'eu-west-1',
  'eu-west-3',
  'eu-north-1',
  'us-east-1',
  'us-west-1',
  'ap-south-1',
]

const sqlFile = process.argv[2] || 'supabase/complete_setup.sql'
const pathSql = resolve(root, sqlFile)

let connStr = process.env.SUPABASE_DATABASE_URL
let projectRef = process.env.SUPABASE_PROJECT_REF || 'ualxcitkqeyqunglasee'
let password = process.env.SUPABASE_DB_PASSWORD

if (!connStr) {
  if (!password) {
    console.error(
      'Ajoutez SUPABASE_DB_PASSWORD ou SUPABASE_DATABASE_URL dans .env',
    )
    process.exit(1)
  }
  connStr = `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`
} else {
  const p = parseConn(connStr)
  password = p.password
  const m = /^db\.([^.]+)\.supabase\.co$/i.exec(p.host || '')
  if (m) projectRef = m[1]
}

if (!existsSync(pathSql)) {
  console.error('Fichier introuvable :', pathSql)
  process.exit(1)
}

async function resolveHost(hostname) {
  try {
    const a = await dns.resolve4(hostname)
    if (a?.length) return a[0]
  } catch {
    /* pas d’IPv4 */
  }
  const a6 = await dns.resolve6(hostname)
  if (a6?.length) return a6[0]
  throw new Error(`DNS : aucune IP pour ${hostname}`)
}

function sslFor(hostname) {
  return { rejectUnauthorized: false, servername: hostname }
}

async function tryConnect(config) {
  const c = new pg.Client(config)
  await c.connect()
  return c
}

async function connectPg() {
  const base = parseConn(connStr)
  const hostname = base.host
  if (!hostname) {
    throw new Error('URL Postgres invalide (host manquant)')
  }

  // Connexion directe (IP résolue + SNI)
  try {
    const addr = await resolveHost(hostname)
    const client = await tryConnect({
      user: base.user,
      password: base.password,
      database: base.database,
      port: Number(base.port) || 5432,
      host: addr,
      ssl: sslFor(hostname),
    })
    return client
  } catch (err) {
    const transient =
      err.code === 'ENETUNREACH' ||
      err.code === 'EHOSTUNREACH' ||
      err.code === 'ETIMEDOUT'
    if (!transient) throw err
    console.warn(
      'Connexion directe indisponible (%s), essai du pooler Supabase…',
      err.code || err.message,
    )
  }

  const user = `postgres.${projectRef}`
  const pass = base.password

  for (const region of POOLER_REGIONS) {
    const poolerHost = `aws-0-${region}.pooler.supabase.com`
    for (const port of [5432, 6543]) {
      try {
        const addr = await resolveHost(poolerHost)
        const client = await tryConnect({
          user,
          password: pass,
          database: 'postgres',
          port,
          host: addr,
          ssl: sslFor(poolerHost),
        })
        console.warn('Connecté via pooler (%s, port %s).', region, port)
        return client
      } catch (err) {
        const authOrProtocol =
          err.message?.includes('password') ||
          err.message?.includes('SASL') ||
          err.code === '28P01'
        if (authOrProtocol) throw err
      }
    }
  }

  throw new Error(
    [
      'Impossible de joindre Postgres depuis cette machine.',
      '1) Collez supabase/all_in_one.sql dans Supabase → SQL Editor → Run, ou',
      '2) Dans le tableau : Project Settings → Database → copiez l’URI « Session pooler »',
      '   dans SUPABASE_DATABASE_URL (région correcte incluse), puis relancez npm run db:run.',
    ].join(' '),
  )
}

const sql = readFileSync(pathSql, 'utf8')
let client
try {
  client = await connectPg()
  await client.query(sql)
  console.log('OK :', sqlFile)
} catch (e) {
  console.error(e.message)
  process.exit(1)
} finally {
  if (client) await client.end()
}
