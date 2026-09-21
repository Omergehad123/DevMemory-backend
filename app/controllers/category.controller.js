const Category = require('../models/category.model');
const AppError = require('../../utilities/appError');
const httpStatusText = require('../../utilities/httpStatusText');
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
      { description: { $regex: escapedSearch, $options: 'i' } },
      { stack: { $regex: escapedSearch, $options: 'i' } },
    ];
  }

  const [categories, totalCategories] = await Promise.all([
    Category.find(filter, { __v: false }).limit(limit).skip(skip),
    Category.countDocuments(filter),
  ]);

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: {
      categories,
      pagination: formatPagination(totalCategories, page, limit),
    },
  });
};

// @desc    Get single category by ID
// @route   GET /api/categories/:id
const getCategoryById = async (req, res, next) => {
  const { id } = req.params;
  const category = await Category.findById(id, { __v: false });

  if (!category) {
    return next(new AppError('Category not found', 404));
  }

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: { category },
  });
};

// @desc    Create a category
// @route   POST /api/categories
const createCategory = async (req, res) => {
  const { name, description, image, stack } = req.body;

  const newCategory = await Category.create({
    name,
    description,
    image,
    stack,
  });

  res.status(201).json({
    status: httpStatusText.SUCCESS,
    data: { category: newCategory },
  });
};

// @desc    Update category by ID
// @route   PATCH /api/categories/:id
const updateCategory = async (req, res, next) => {
  const { id } = req.params;

  const allowedUpdates = ['name', 'description', 'image', 'stack'];
  const updateData = {};
  for (const key of allowedUpdates) {
    if (req.body[key] !== undefined) {
      updateData[key] = req.body[key];
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

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: { category: updatedCategory },
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
