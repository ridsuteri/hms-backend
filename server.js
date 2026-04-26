const express = require("express");
const dotenv = require("dotenv");
const connectToDb = require("./config/db");
const adminauth = require("./routes/adminAuth");
const auth = require("./routes/auth");

dotenv.config();

const app = express();
const port = process.env.PORT;

connectToDb();

app.use(express.json())

app.use("/api/adminauth/", adminauth);
app.use("/api/auth", auth);

app.get("/health-check", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
