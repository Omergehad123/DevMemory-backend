const Reference = require('../models/reference.model');
const Category = require('../models/category.model');
const AppError = require('../../utilities/appError');
const httpStatusText = require('../../utilities/httpStatusText');
const {
  getPagination,
  formatPagination,
  escapeRegex,
} = require('../../utilities/queryHelpers');

const POPULATE_CATEGORY = {
  path: 'categoryId',
  select: 'name stack image',
};

// @desc    Get all references
// @route   GET /api/references
const getAllReferences = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};

  // Search by title or description
  if (req.query.search && req.query.search.trim()) {
    const escapedSearch = escapeRegex(req.query.search.trim());
    filter.$or = [
      { title: { $regex: escapedSearch, $options: 'i' } },
      { description: { $regex: escapedSearch, $options: 'i' } },
    ];
  }

  // Filter by category
  const catId = req.query.categoryId || req.query.category;
  if (catId && catId !== 'all') {
    filter.categoryId = catId;
  }

  // Sort options
  const sortMap = {
    'created-desc': { createdAt: -1 },
    'title-asc': { title: 1 },
    'updated-desc': { updatedAt: -1 },
  };
  const sortOption = sortMap[req.query.sortBy] || { updatedAt: -1 };

  const [references, totalReferences] = await Promise.all([
    Reference.find(filter, { __v: false })
      .populate(POPULATE_CATEGORY)
      .sort(sortOption)
      .limit(limit)
      .skip(skip),
    Reference.countDocuments(filter),
  ]);

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: {
      references,
      pagination: formatPagination(totalReferences, page, limit),
    },
  });
};

// @desc    Get single reference by ID
// @route   GET /api/references/:id
const getReferenceById = async (req, res, next) => {
  const { id } = req.params;
  const reference = await Reference.findById(id, { __v: false }).populate(
    POPULATE_CATEGORY
  );

  if (!reference) {
    return next(new AppError('Reference not found', 404));
  }

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: { reference },
  });
};

// @desc    Create a new reference
// @route   POST /api/references
const createReference = async (req, res, next) => {
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
    return next(new AppError('Reference title is required', 400));
  }

  if (!resolvedCategoryId) {
    return next(new AppError('Category ID is required', 400));
  }

  // Verify associated category exists
  const targetCategory = await Category.findById(resolvedCategoryId);
  if (!targetCategory) {
    return next(new AppError('Associated category does not exist', 404));
  }

  const newReference = await Reference.create({
    title,
    categoryId: resolvedCategoryId,
    whyContent: whyContent || null,
    whatContent: whatContent || content || null,
    howContent: howContent || null,
    description: description || '',
  });

  await newReference.populate(POPULATE_CATEGORY);

  res.status(201).json({
    status: httpStatusText.SUCCESS,
    data: { reference: newReference },
  });
};

// @desc    Update reference by ID
// @route   PATCH /api/references/:id
const updateReference = async (req, res, next) => {
  const { id } = req.params;

  const allowedUpdates = [
    'title',
    'categoryId',
    'category',
    'whyContent',
    'whatContent',
    'howContent',
    'content',
    'description',
  ];

  const updateData = {};
  for (const key of allowedUpdates) {
    if (req.body[key] !== undefined) {
      updateData[key] = req.body[key];
    }
  }

  // Handle field aliases
  if (updateData.category && !updateData.categoryId) {
    updateData.categoryId = updateData.category;
    delete updateData.category;
  }
  if (updateData.content !== undefined && updateData.whatContent === undefined) {
    updateData.whatContent = updateData.content;
  }
  delete updateData.content;

  // If category is being updated, verify it exists
  if (updateData.categoryId) {
    const targetCategory = await Category.findById(updateData.categoryId);
    if (!targetCategory) {
      return next(new AppError('New associated category does not exist', 404));
    }
  }

  const updatedReference = await Reference.findByIdAndUpdate(
    id,
    { $set: updateData },
    { returnDocument: 'after', runValidators: true }
  ).populate(POPULATE_CATEGORY);

  if (!updatedReference) {
    return next(new AppError('Reference not found', 404));
  }

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: { reference: updatedReference },
  });
};

// @desc    Delete reference by ID
// @route   DELETE /api/references/:id
const deleteReference = async (req, res, next) => {
  const { id } = req.params;
  const reference = await Reference.findByIdAndDelete(id);

  if (!reference) {
    return next(new AppError('Reference not found', 404));
  }

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: null,
  });
};

module.exports = {
  getAllReferences,
  getReferenceById,
  createReference,
  updateReference,
  deleteReference,
};
