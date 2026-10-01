const mongoose = require('mongoose');
const { slugify } = require('../../utilities/slugHelper');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    seoTitle: {
      type: String,
      trim: true,
      default: '',
    },
    seoDescription: {
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

// Auto-generate slug from name if not provided
categorySchema.pre('validate', function () {
  if (this.slug) {
    this.slug = slugify(this.slug);
  } else if (this.name) {
    this.slug = slugify(this.name);
  }
});

// Virtual populate for references without persisting duplicate unbounded ID arrays
categorySchema.virtual('references', {
  ref: 'Reference',
  localField: '_id',
  foreignField: 'categoryId',
});

module.exports = mongoose.model('Category', categorySchema);

