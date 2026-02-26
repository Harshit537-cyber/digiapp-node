const mongoose = require("mongoose");

const displayimage = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  photo:[String]
});



module.exports = mongoose.model("Displayimage", displayimage);
