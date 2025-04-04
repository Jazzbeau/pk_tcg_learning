import mysql from 'mysql2/promise';

// This is my persona MYSQL database; we obviously need to change this 
const connection = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'mypassword',   // These need to be setup on our end
  database: 'pktcg',
});

export default connection;
