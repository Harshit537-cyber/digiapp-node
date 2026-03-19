const notificationSchema = new mongoose.Schema({
  title: String,
  message: String,

  type: {
    type: String,
    enum: ["BUSINESS_VERIFICATION"],
  },

  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Business",
  },

  isRead: {
    type: Boolean,
    default: false,
  },

}, { timestamps: true });
