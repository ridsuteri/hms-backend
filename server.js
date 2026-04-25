const express = require('express')
const dotenv = require('dotenv');
const connectToDb = require('./config/db');
dotenv.config()

const app = express()
const port = process.env.PORT

connectToDb();

app.get('/health-check', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
