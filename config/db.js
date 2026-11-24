const mysql = require("mysql2");

const database = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "aethera_db",
});

database.connect((err) => {
    if (err) {
        console.log("Database Connection Failed: ", err);
    } else {
        console.log("Connection established with database");
    }
});

module.exports = database;