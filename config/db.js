// config/db.js
const mongoose = require("mongoose",{
  family: 4
});

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      tls: true,
    });

    mongoose.connection.once("open", () => {
      console.log("🟢 MongoDB is READY!");
    });

    console.log(`✅ MongoDB Connected`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
//const mongoose = require("mongoose",{
  //family: 4
//})
