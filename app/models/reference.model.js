const mongoose = require('mongoose');

const referenceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Reference title is required'],
      trim: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    whyContent: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    whatContent: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    howContent: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    content: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Reference', referenceSchema);
