const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    image: {
      type: String,
      default: '',
    },
    stack: {
      type: String,
      trim: true,
      default: 'General',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual populate for references without persisting duplicate unbounded ID arrays
categorySchema.virtual('references', {
  ref: 'Reference',
  localField: '_id',
  foreignField: 'categoryId',
});

module.exports = mongoose.model('Category', categorySchema);
