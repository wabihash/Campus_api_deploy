const mysql2 = require('mysql2');
require('dotenv').config();
const db = mysql2.createPool({
    host: process.env.DB_HOST,
     user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: parseInt(process.env.DB_CONN_LIMIT, 10)
})
module.exports = db.promise();