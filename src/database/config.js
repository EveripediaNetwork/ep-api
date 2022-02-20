/* eslint-disable @typescript-eslint/no-var-requires */
const dotenv = require('dotenv')

dotenv.config()

module.exports = {
  development: {
    dialect: 'postgres',
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: `${process.env.DB_NAME}-${process.env.NODE_ENV}`,
    host: process.env.DB_HOST,
    port: 5432,
  },
  test: {
    dialect: 'postgres',
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: `${process.env.DB_NAME}-${process.env.NODE_ENV}`,
    host: process.env.DB_HOST,
    port: 5432,
  },
}
