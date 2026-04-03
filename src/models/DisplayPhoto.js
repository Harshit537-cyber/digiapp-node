const mongoose = require("mongoose");

const Displayimage = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  photo:[String]
});



module.exports = mongoose.model("Displayimage", Displayimage);
