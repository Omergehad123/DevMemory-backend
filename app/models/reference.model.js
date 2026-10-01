const mongoose = require('mongoose');
const { slugify } = require('../../utilities/slugHelper');

const referenceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Reference title is required'],
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Auto-generate slug from title if not provided & populate whatContent from content if provided
referenceSchema.pre('validate', function () {
  if (this.slug) {
    this.slug = slugify(this.slug);
  } else if (this.title) {
    this.slug = slugify(this.title);
  }

  if (this.content && !this.whatContent) {
    this.whatContent = this.content;
  }
});

// Legacy virtual field 'content' returns 'whatContent'
referenceSchema.virtual('content').get(function () {
  return this.whatContent;
});

module.exports = mongoose.model('Reference', referenceSchema);


