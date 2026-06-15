const mongoose = require('mongoose');

const jobsCategorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true 
  },

  type: {
    type: String,
    enum: ["LOCAL_JOB", "PART_TIME_JOB", "FULL_TIME_JOB"],
    required: true
  },
  image: { type: String }, 
  subCategory: { 
    type: [String], 
    default: [] 
  },

  status: { type: Boolean, default: true },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  }

}, { timestamps: true });

module.exports = mongoose.model('JobsCategory', jobsCategorySchema);