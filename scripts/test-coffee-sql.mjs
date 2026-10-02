// Optional isolated PostgreSQL test: node scripts/test-coffee-sql.mjs <PGlite package directory>
// Install PGlite in a temporary directory; it is not an application dependency.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(pathToFileURL(resolve(process.argv[2], 'dist/index.js')).href);
const db = new PGlite();
try {
  await db.exec('create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key);');
  const schema = await readFile('supabase-schema.sql', 'utf8');
  // Only table definitions, never the destructive schema reset or Supabase services.
  await db.exec(schema.slice(schema.indexOf('  create table admins ('), schema.indexOf('  -- 2) Row Level Security')));
  // Ensure migration creates its column, rather than relying on the fresh schema.
  await db.exec('alter table products drop column coffee_sizes;');
  const migration = await readFile('supabase/migrations/202610020001_add_coffee_sizes.sql', 'utf8');
  await db.exec(migration);
  await db.exec(migration); // Rerunning the migration must remain safe.
  await db.exec(await readFile('supabase/tests/coffee_sizes.sql', 'utf8'));
  console.log('PASS PostgreSQL migration, repeat apply, independent stock, server pricing, rollback, restore and brand validation');
} catch (error) {
  console.error(error.message, error.where || '', error.detail || '', error.position || '');
  process.exitCode = 1;
} finally { await db.close(); }
