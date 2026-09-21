const Reference = require('../models/reference.model');
const Category = require('../models/category.model');
const asyncWrapper = require('../middlewares/asyncWrapper');
const AppError = require('../../utilities/appError');
const httpStatusText = require('../../utilities/httpStatusText');

const formatReference = (ref) => {
  if (!ref) return ref;
  const obj = ref.toObject ? ref.toObject() : { ...ref };
  if (!obj.whatContent && obj.content) {
    obj.whatContent = obj.content;
  }
  return obj;
};

// @desc    Get all references
// @route   GET /api/references
const getAllReferences = asyncWrapper(async (req, res, next) => {
  const query = req.query;
  const limit = parseInt(query.limit) || 10;
  const page = parseInt(query.page) || 1;
  const skip = (page - 1) * limit;

  const filter = {};

  // Search by title or description
  if (query.search) {
    filter.$or = [
      { title: { $regex: query.search, $options: 'i' } },
      { description: { $regex: query.search, $options: 'i' } },
    ];
  }

  // Filter by category
  const catId = query.categoryId || query.category;
  if (catId && catId !== 'all') {
    filter.categoryId = catId;
  }

  // Sort options
  let sortOption = { updatedAt: -1 };
  if (query.sortBy === 'created-desc') {
    sortOption = { createdAt: -1 };
  } else if (query.sortBy === 'title-asc') {
    sortOption = { title: 1 };
  } else if (query.sortBy === 'updated-desc') {
    sortOption = { updatedAt: -1 };
  }

  const references = await Reference.find(filter, { __v: false })
    .populate('categoryId', 'name stack image')
    .sort(sortOption)
    .limit(limit)
    .skip(skip);

  const totalReferences = await Reference.countDocuments(filter);

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: {
      references: references.map(formatReference),
      pagination: {
        total: totalReferences,
        page,
        limit,
        pages: Math.ceil(totalReferences / limit) || 1,
      },
    },
  });
});

// @desc    Get single reference by ID
// @route   GET /api/references/:id
const getReferenceById = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const reference = await Reference.findById(id, { __v: false }).populate(
    'categoryId',
    'name stack image'
  );

  if (!reference) {
    const error = new AppError('Reference not found', 404);
    return next(error);
  }

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: { reference: formatReference(reference) },
  });
});

// @desc    Create a new reference
// @route   POST /api/references
const createReference = asyncWrapper(async (req, res, next) => {
  const {
    title,
    categoryId,
    category,
    whyContent,
    whatContent,
    howContent,
    content,
    description,
  } = req.body;
  const resolvedCategoryId = categoryId || category;

  if (!title) {
    const error = new AppError('Reference title is required', 400);
    return next(error);
  }

  if (!resolvedCategoryId) {
    const error = new AppError('Category ID is required', 400);
    return next(error);
  }

  // Verify category exists
  const targetCategory = await Category.findById(resolvedCategoryId);
  if (!targetCategory) {
    const error = new AppError('Associated category does not exist', 404);
    return next(error);
  }

  const newReference = new Reference({
    title,
    categoryId: resolvedCategoryId,
    whyContent: whyContent || null,
    whatContent: whatContent || content || null,
    howContent: howContent || null,
    content: content || whatContent || null,
    description: description || '',
  });

  await newReference.save();

  // Add reference ID to the category's references array
  await Category.findByIdAndUpdate(resolvedCategoryId, {
    $addToSet: { references: newReference._id },
  });

  // Populate category info for response
  await newReference.populate('categoryId', 'name stack image');

  res.status(201).json({
    status: httpStatusText.SUCCESS,
    data: { reference: formatReference(newReference) },
  });
});

// @desc    Update reference by ID
// @route   PATCH /api/references/:id
const updateReference = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const existingReference = await Reference.findById(id);

  if (!existingReference) {
    const error = new AppError('Reference not found', 404);
    return next(error);
  }

  const newCategoryId = req.body.categoryId || req.body.category;

  // If category is changing, check if new category exists and update category references arrays
  if (newCategoryId && newCategoryId.toString() !== existingReference.categoryId.toString()) {
    const targetCategory = await Category.findById(newCategoryId);
    if (!targetCategory) {
      const error = new AppError('New associated category does not exist', 404);
      return next(error);
    }

    // Pull from old category
    await Category.findByIdAndUpdate(existingReference.categoryId, {
      $pull: { references: existingReference._id },
    });

    // Push to new category
    await Category.findByIdAndUpdate(newCategoryId, {
      $addToSet: { references: existingReference._id },
    });

    req.body.categoryId = newCategoryId;
  }

  // If whatContent is updated but content is not, keep legacy content in sync
  if (req.body.whatContent !== undefined && req.body.content === undefined) {
    req.body.content = req.body.whatContent;
  }

  const updatedReference = await Reference.findByIdAndUpdate(
    id,
    { $set: { ...req.body } },
    { new: true, runValidators: true }
  ).populate('categoryId', 'name stack image');

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: { reference: formatReference(updatedReference) },
  });
});

// @desc    Delete reference by ID
// @route   DELETE /api/references/:id
const deleteReference = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const reference = await Reference.findByIdAndDelete(id);

  if (!reference) {
    const error = new AppError('Reference not found', 404);
    return next(error);
  }

  // Remove reference from category's references array
  if (reference.categoryId) {
    await Category.findByIdAndUpdate(reference.categoryId, {
      $pull: { references: reference._id },
    });
  }

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: null,
  });
});

module.exports = {
  getAllReferences,
  getReferenceById,
  createReference,
  updateReference,
  deleteReference,
};
