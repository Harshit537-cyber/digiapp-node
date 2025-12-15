const mongoose = require("mongoose");
const chalk = require("chalk");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB_URL);

    console.log(
      chalk.bgGreen.black(" SUCCESS "),
      chalk.green.bold("MongoDB Connected Successfully")
    );

  } catch (err) {
    console.error(
      chalk.bgRed.white(" ERROR "),
      chalk.red.bold("MongoDB Connection Failed"),
      "\n",
      chalk.yellow(err.message)
    );
    process.exit(1);
  }
};

module.exports = connectDB;
