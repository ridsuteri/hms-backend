const express = require("express");
const dotenv = require("dotenv");
const connectToDb = require("./config/db");
const adminauthRoutes = require("./routes/adminAuthRoutes");
const authRoutes = require("./routes/authRoutes");
const formRoutes = require('./routes/registrationformRoutes')
const doctorlistRoutes = require('./routes/doctorlistRoutes')

dotenv.config();

const app = express();
const port = process.env.PORT;

connectToDb();

app.use(express.json())

app.use("/api/adminauth/", adminauthRoutes);
app.use("/api/auth", authRoutes);
app.use('/api/form', formRoutes);
app.use('/api/admin/doctorlist', doctorlistRoutes);

app.get("/health-check", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
