import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL || 'mysql://root:rootpassword@localhost:3306/cadeb_db';
const dbDtotUrl = process.env.DB_DTOT_URL || 'mysql://root:rootpassword@localhost:3306/db_dtot';

// Connection pools
export const connectionCadeb = mysql.createPool({
  uri: databaseUrl,
});

export const connectionDtot = mysql.createPool({
  uri: dbDtotUrl,
});

// Drizzle instances
export const db = drizzle(connectionCadeb, { schema, mode: 'default' });
export const dbDtot = drizzle(connectionDtot, { schema, mode: 'default' });
