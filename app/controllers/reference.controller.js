const mongoose = require('mongoose');
const Reference = require('../models/reference.model');
const Category = require('../models/category.model');
const AppError = require('../../utilities/appError');
const httpStatusText = require('../../utilities/httpStatusText');
const { slugify } = require('../../utilities/slugHelper');
const {
  getPagination,
  formatPagination,
  escapeRegex,
} = require('../../utilities/queryHelpers');

const POPULATE_CATEGORY = {
  path: 'categoryId',
  select: 'name stack image slug',
};

// @desc    Get all references
// @route   GET /api/references
const getAllReferences = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};

  // Search by title or description or slug
  if (req.query.search && req.query.search.trim()) {
    const escapedSearch = escapeRegex(req.query.search.trim());
    filter.$or = [
      { title: { $regex: escapedSearch, $options: 'i' } },
      { slug: { $regex: escapedSearch, $options: 'i' } },
      { description: { $regex: escapedSearch, $options: 'i' } },
    ];
  }

  // Filter by slug
  if (req.query.slug && req.query.slug.trim()) {
    filter.slug = req.query.slug.trim().toLowerCase();
  }

  // Filter by category (by ID or Slug)
  const rawCat = req.query.categoryId || req.query.category || req.query.categorySlug;
  if (rawCat && rawCat !== 'all') {
    if (mongoose.Types.ObjectId.isValid(rawCat)) {
      filter.categoryId = rawCat;
    } else {
      // Find category by slug or name
      const cat = await Category.findOne({
        $or: [
          { slug: rawCat.trim().toLowerCase() },
          { name: { $regex: `^${escapeRegex(rawCat.trim())}$`, $options: 'i' } },
        ],
      });
      if (cat) {
        filter.categoryId = cat._id;
      } else {
        // Return empty result since category does not exist
        return res.status(200).json({
          status: httpStatusText.SUCCESS,
          data: {
            references: [],
            pagination: formatPagination(0, page, limit),
          },
        });
      }
    }
  }

  // Sort options
  const sortMap = {
    'created-desc': { createdAt: -1 },
    'title-asc': { title: 1 },
    'updated-desc': { updatedAt: -1 },
  };
  const sortOption = sortMap[req.query.sortBy] || { createdAt: -1 };

  const [references, totalReferences] = await Promise.all([
    Reference.find(filter, { __v: false })
      .populate(POPULATE_CATEGORY)
      .sort(sortOption)
      .limit(limit)
      .skip(skip),
    Reference.countDocuments(filter),
  ]);

  // Ensure all references and their populated category have a valid slug fallback
  const normalizedReferences = references.map((ref) => {
    const refObj = ref.toObject ? ref.toObject() : { ...ref };
    if (!refObj.slug) {
      refObj.slug = slugify(refObj.title) || String(refObj._id);
    }
    if (refObj.categoryId && typeof refObj.categoryId === 'object') {
      if (!refObj.categoryId.slug) {
        refObj.categoryId.slug = slugify(refObj.categoryId.name) || String(refObj.categoryId._id);
      }
    }
    return refObj;
  });

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: {
      references: normalizedReferences,
      pagination: formatPagination(totalReferences, page, limit),
    },
  });
};

// @desc    Get single reference by ID or slug
// @route   GET /api/references/:id
const getReferenceById = async (req, res, next) => {
  const { id } = req.params;
  let reference = null;

  // 1. Try finding by MongoDB ObjectId
  if (mongoose.Types.ObjectId.isValid(id)) {
    reference = await Reference.findById(id, { __v: false }).populate(POPULATE_CATEGORY);
  }

  // 2. Try finding by slug or title if not found by ID
  if (!reference) {
    const cleanParam = id.trim().toLowerCase();
    const query = {
      $or: [
        { slug: cleanParam },
        { title: { $regex: `^${escapeRegex(id.trim())}$`, $options: 'i' } },
      ],
    };

    // If categoryId or categorySlug is provided, scope search to that category
    const rawCat = req.query.categoryId || req.query.category || req.query.categorySlug;
    if (rawCat) {
      if (mongoose.Types.ObjectId.isValid(rawCat)) {
        query.categoryId = rawCat;
      } else {
        const cat = await Category.findOne({
          $or: [
            { slug: rawCat.trim().toLowerCase() },
            { name: { $regex: `^${escapeRegex(rawCat.trim())}$`, $options: 'i' } },
          ],
        });
        if (cat) {
          query.categoryId = cat._id;
        }
      }
    }

    reference = await Reference.findOne(query, { __v: false }).populate(POPULATE_CATEGORY);
  }

  if (!reference) {
    return next(new AppError('Reference not found', 404));
  }

  const refObj = reference.toObject ? reference.toObject() : { ...reference };
  if (!refObj.slug) {
    refObj.slug = slugify(refObj.title) || String(refObj._id);
  }
  if (refObj.categoryId && typeof refObj.categoryId === 'object') {
    if (!refObj.categoryId.slug) {
      refObj.categoryId.slug = slugify(refObj.categoryId.name) || String(refObj.categoryId._id);
    }
  }

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: { reference: refObj },
  });
};

// @desc    Create a new reference
// @route   POST /api/references
const createReference = async (req, res, next) => {
  const {
    title,
    slug,
    categoryId,
    category,
    whyContent,
    whatContent,
    howContent,
    content,
    description,
    seoTitle,
    seoDescription,
  } = req.body;
  const resolvedCategoryId = categoryId || category;

  if (!title || !title.trim()) {
    return next(new AppError('Reference title is required', 400));
  }

  if (!resolvedCategoryId) {
    return next(new AppError('Category ID is required', 400));
  }

  // Verify associated category exists
  let targetCategory = null;
  if (mongoose.Types.ObjectId.isValid(resolvedCategoryId)) {
    targetCategory = await Category.findById(resolvedCategoryId);
  } else {
    targetCategory = await Category.findOne({
      $or: [
        { slug: resolvedCategoryId.trim().toLowerCase() },
        { name: { $regex: `^${escapeRegex(resolvedCategoryId.trim())}$`, $options: 'i' } },
      ],
    });
  }

  if (!targetCategory) {
    return next(new AppError('Associated category does not exist', 404));
  }

  const computedSlug = slug && slug.trim() ? slugify(slug) : slugify(title);

  const newReference = await Reference.create({
    title: title.trim(),
    slug: computedSlug || undefined,
    categoryId: targetCategory._id,
    whyContent: whyContent || null,
    whatContent: whatContent || content || null,
    howContent: howContent || null,
    description: description ? description.trim() : '',
    seoTitle: seoTitle ? seoTitle.trim() : '',
    seoDescription: seoDescription ? seoDescription.trim() : '',
  });

  await newReference.populate(POPULATE_CATEGORY);

  const refObj = newReference.toObject ? newReference.toObject() : { ...newReference };
  if (!refObj.slug) {
    refObj.slug = slugify(refObj.title) || String(refObj._id);
  }
  if (refObj.categoryId && typeof refObj.categoryId === 'object') {
    if (!refObj.categoryId.slug) {
      refObj.categoryId.slug = slugify(refObj.categoryId.name) || String(refObj.categoryId._id);
    }
  }

  res.status(201).json({
    status: httpStatusText.SUCCESS,
    data: { reference: refObj },
  });
};

// @desc    Update reference by ID
// @route   PATCH /api/references/:id
const updateReference = async (req, res, next) => {
  const { id } = req.params;

  const allowedUpdates = [
    'title',
    'slug',
    'categoryId',
    'category',
    'whyContent',
    'whatContent',
    'howContent',
    'content',
    'description',
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
    } else if (req.body.title && req.body.title.trim()) {
      updateData.slug = slugify(req.body.title.trim());
    } else {
      const existing = await Reference.findById(id);
      if (existing && existing.title) {
        updateData.slug = slugify(existing.title);
      }
    }
  } else if (req.body.title && req.body.title.trim()) {
    const existing = await Reference.findById(id);
    if (existing && (!existing.slug || existing.slug === slugify(existing.title))) {
      updateData.slug = slugify(req.body.title.trim());
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
    let targetCategory = null;
    if (mongoose.Types.ObjectId.isValid(updateData.categoryId)) {
      targetCategory = await Category.findById(updateData.categoryId);
    } else {
      targetCategory = await Category.findOne({
        $or: [
          { slug: updateData.categoryId.trim().toLowerCase() },
          { name: { $regex: `^${escapeRegex(updateData.categoryId.trim())}$`, $options: 'i' } },
        ],
      });
    }
    if (!targetCategory) {
      return next(new AppError('New associated category does not exist', 404));
    }
    updateData.categoryId = targetCategory._id;
  }

  const updatedReference = await Reference.findByIdAndUpdate(
    id,
    { $set: updateData },
    { returnDocument: 'after', runValidators: true }
  ).populate(POPULATE_CATEGORY);

  if (!updatedReference) {
    return next(new AppError('Reference not found', 404));
  }

  const refObj = updatedReference.toObject ? updatedReference.toObject() : { ...updatedReference };
  if (!refObj.slug) {
    refObj.slug = slugify(refObj.title) || String(refObj._id);
  }
  if (refObj.categoryId && typeof refObj.categoryId === 'object') {
    if (!refObj.categoryId.slug) {
      refObj.categoryId.slug = slugify(refObj.categoryId.name) || String(refObj.categoryId._id);
    }
  }

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: { reference: refObj },
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

