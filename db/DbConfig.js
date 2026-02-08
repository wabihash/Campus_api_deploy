const mysql2 = require('mysql2');
require('dotenv').config();

const db = mysql2.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 4000,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    // TiDB Cloud REQUIRES this SSL block
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    },
    connectionLimit: 10
});

module.exports = db.promise();