const mongoose = require('mongoose');

const connectToDb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to db!");
  } catch (error) {
    console.log("Db connection failed:", error);
  }
};

module.exports = connectToDb;
