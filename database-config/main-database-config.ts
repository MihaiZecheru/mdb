require('dotenv').config();
const Pool = require('pg').Pool;

const db = new Pool({
    host: process.env['DB_HOST'],
    port: process.env['DB_PORT'],
    database: process.env['DB_NAME'],
    user: process.env['DB_USER'],
    password: process.env['DB_PASSWORD']
});

export default db;