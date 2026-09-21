const Category = require('../models/category.model');
const asyncWrapper = require('../middlewares/asyncWrapper');
const AppError = require('../../utilities/appError');
const httpStatusText = require('../../utilities/httpStatusText');

// @desc    Get all categories
// @route   GET /api/categories
const getAllCategories = asyncWrapper(async (req, res, next) => {
  const query = req.query;
  const limit = parseInt(query.limit) || 10;
  const page = parseInt(query.page) || 1;
  const skip = (page - 1) * limit;

  const filter = {};
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { description: { $regex: query.search, $options: 'i' } },
      { stack: { $regex: query.search, $options: 'i' } },
    ];
  }

  const categories = await Category.find(filter, { __v: false })
    .limit(limit)
    .skip(skip);

  const totalCategories = await Category.countDocuments(filter);

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: {
      categories,
      pagination: {
        total: totalCategories,
        page,
        limit,
        pages: Math.ceil(totalCategories / limit) || 1,
      },
    },
  });
});

// @desc    Get single category by ID
// @route   GET /api/categories/:id
const getCategoryById = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const category = await Category.findById(id, { __v: false });

  if (!category) {
    const error = new AppError('Category not found', 404);
    return next(error);
  }

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: { category },
  });
});

// @desc    Create a category
// @route   POST /api/categories
const createCategory = asyncWrapper(async (req, res, next) => {
  const { name, description, references, image, stack } = req.body;

  if (!name) {
    const error = new AppError('Category name is required', 400);
    return next(error);
  }

  const existingCategory = await Category.findOne({ name });
  if (existingCategory) {
    const error = new AppError('Category with this name already exists', 400);
    return next(error);
  }

  const newCategory = new Category({
    name,
    description,
    references: references || [],
    image: image || '',
    stack: stack || 'General',
  });

  await newCategory.save();

  res.status(201).json({
    status: httpStatusText.SUCCESS,
    data: { category: newCategory },
  });
});

// @desc    Update category by ID
// @route   PATCH /api/categories/:id
const updateCategory = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const updatedCategory = await Category.findByIdAndUpdate(
    id,
    { $set: { ...req.body } },
    { new: true, runValidators: true }
  );

  if (!updatedCategory) {
    const error = new AppError('Category not found', 404);
    return next(error);
  }

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: { category: updatedCategory },
  });
});

// @desc    Delete category by ID
// @route   DELETE /api/categories/:id
const deleteCategory = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const category = await Category.findByIdAndDelete(id);

  if (!category) {
    const error = new AppError('Category not found', 404);
    return next(error);
  }

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: null,
  });
});

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
