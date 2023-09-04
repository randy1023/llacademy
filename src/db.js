import mysql from "mysql2";

/* import { database } from  './keys.js'; */

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "1023sor&RAN",
  port: 3306,
  database: "llacademys",
});

pool.getConnection((err, conn) => {
  if (err) {
    if (err.code == "PROTOCOL_CONNECTION_LOST") {
      console.error("DATABASE CONNECTION WAS LOST");
    }
    if (err.code === "ER_CON_COUNT_ERROR") {
      console.error("DATABASE HAS TO MANY CONNECTIONS");
    }
    if (err.code === "ECONNREFUSED") {
      console.error("DATABASE CONNECTION WAS REFUSED");
    }
  }

  if (conn) conn.release();
  console.log("DB is connected");
  return;
});

export const promispool = pool.promise();
export default pool;
