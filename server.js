const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const connectToDb = require("./config/db");
const client = require('./config/redis')
const adminauthRoutes = require("./routes/adminAuthRoutes");
const authRoutes = require("./routes/authRoutes");
const formRoutes = require("./routes/registrationformRoutes");
const doctorlistRoutes = require("./routes/doctorlistRoutes");

dotenv.config();

const app = express();
const port = process.env.PORT;
const frontendDir = path.join(__dirname, "frontend");
const adminDashboardDir = path.join(frontendDir, "admin-dashboard");

connectToDb();
client.connect();


app.use(express.json());
app.use(express.static(frontendDir));
app.use("/admin-dashboard", express.static(adminDashboardDir));

app.use("/api/adminauth/", adminauthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/form", formRoutes);
app.use("/api/admin/doctorlist", doctorlistRoutes);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

app.get("/admin-dashboard", (req, res) => {
  res.sendFile(path.join(adminDashboardDir, "adminLoginpage.html"));
});

app.get("/health-check", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
