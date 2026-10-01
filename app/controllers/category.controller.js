const mongoose = require('mongoose');
const Category = require('../models/category.model');
const AppError = require('../../utilities/appError');
const httpStatusText = require('../../utilities/httpStatusText');
const { slugify } = require('../../utilities/slugHelper');
const {
  getPagination,
  formatPagination,
  escapeRegex,
} = require('../../utilities/queryHelpers');

// @desc    Get all categories
// @route   GET /api/categories
const getAllCategories = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};

  if (req.query.search && req.query.search.trim()) {
    const escapedSearch = escapeRegex(req.query.search.trim());
    filter.$or = [
      { name: { $regex: escapedSearch, $options: 'i' } },
      { slug: { $regex: escapedSearch, $options: 'i' } },
      { description: { $regex: escapedSearch, $options: 'i' } },
      { stack: { $regex: escapedSearch, $options: 'i' } },
    ];
  }

  const [categories, totalCategories] = await Promise.all([
    Category.find(filter, { __v: false }).sort({ createdAt: -1 }).limit(limit).skip(skip),
    Category.countDocuments(filter),
  ]);

  // Ensure all categories have a valid slug fallback
  const normalizedCategories = categories.map((cat) => {
    const catObj = cat.toObject ? cat.toObject() : { ...cat };
    if (!catObj.slug) {
      catObj.slug = slugify(catObj.name) || String(catObj._id);
    }
    return catObj;
  });

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: {
      categories: normalizedCategories,
      pagination: formatPagination(totalCategories, page, limit),
    },
  });
};

// @desc    Get single category by ID or slug
// @route   GET /api/categories/:id
const getCategoryById = async (req, res, next) => {
  const { id } = req.params;
  let category = null;

  if (mongoose.Types.ObjectId.isValid(id)) {
    category = await Category.findById(id, { __v: false });
  }

  // Fallback to find by slug or name if not found by ObjectId
  if (!category) {
    const cleanParam = id.trim().toLowerCase();
    category = await Category.findOne(
      {
        $or: [
          { slug: cleanParam },
          { name: { $regex: `^${escapeRegex(id.trim())}$`, $options: 'i' } },
        ],
      },
      { __v: false }
    );
  }

  if (!category) {
    return next(new AppError('Category not found', 404));
  }

  const catObj = category.toObject ? category.toObject() : { ...category };
  if (!catObj.slug) {
    catObj.slug = slugify(catObj.name) || String(catObj._id);
  }

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: { category: catObj },
  });
};

// @desc    Create a category
// @route   POST /api/categories
const createCategory = async (req, res, next) => {
  const { name, slug, description, image, stack, seoTitle, seoDescription } = req.body;

  if (!name || !name.trim()) {
    return next(new AppError('Category name is required', 400));
  }

  const computedSlug = slug && slug.trim() ? slugify(slug) : slugify(name);

  const newCategory = await Category.create({
    name: name.trim(),
    slug: computedSlug || undefined,
    description: description ? description.trim() : '',
    image: image ? image.trim() : '',
    stack: stack ? stack.trim() : 'General',
    seoTitle: seoTitle ? seoTitle.trim() : '',
    seoDescription: seoDescription ? seoDescription.trim() : '',
  });

  const catObj = newCategory.toObject ? newCategory.toObject() : { ...newCategory };
  if (!catObj.slug) {
    catObj.slug = slugify(catObj.name) || String(catObj._id);
  }

  res.status(201).json({
    status: httpStatusText.SUCCESS,
    data: { category: catObj },
  });
};

// @desc    Update category by ID
// @route   PATCH /api/categories/:id
const updateCategory = async (req, res, next) => {
  const { id } = req.params;

  const allowedUpdates = [
    'name',
    'slug',
    'description',
    'image',
    'stack',
    'seoTitle',
    'seoDescription',
  ];
  const updateData = {};
  for (const key of allowedUpdates) {
    if (req.body[key] !== undefined) {
      if (key !== 'slug') {
        updateData[key] = req.body[key];
      }
    }
  }

  if (req.body.slug !== undefined) {
    const rawSlug = req.body.slug ? req.body.slug.trim() : '';
    if (rawSlug) {
      updateData.slug = slugify(rawSlug);
    } else if (req.body.name && req.body.name.trim()) {
      updateData.slug = slugify(req.body.name.trim());
    } else {
      const existing = await Category.findById(id);
      if (existing && existing.name) {
        updateData.slug = slugify(existing.name);
      }
    }
  } else if (req.body.name && req.body.name.trim()) {
    const existing = await Category.findById(id);
    if (existing && (!existing.slug || existing.slug === slugify(existing.name))) {
      updateData.slug = slugify(req.body.name.trim());
    }
  }

  const updatedCategory = await Category.findByIdAndUpdate(
    id,
    { $set: updateData },
    { returnDocument: 'after', runValidators: true }
  );

  if (!updatedCategory) {
    return next(new AppError('Category not found', 404));
  }

  const catObj = updatedCategory.toObject ? updatedCategory.toObject() : { ...updatedCategory };
  if (!catObj.slug) {
    catObj.slug = slugify(catObj.name) || String(catObj._id);
  }

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: { category: catObj },
  });
};

// @desc    Delete category by ID
// @route   DELETE /api/categories/:id
const deleteCategory = async (req, res, next) => {
  const { id } = req.params;
  const category = await Category.findByIdAndDelete(id);

  if (!category) {
    return next(new AppError('Category not found', 404));
  }

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: null,
  });
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};

