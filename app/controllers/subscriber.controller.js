const mongoose = require('mongoose');
const Subscriber = require('../models/subscriber.model');
const AppError = require('../../utilities/appError');
const httpStatusText = require('../../utilities/httpStatusText');
const {
  getPagination,
  formatPagination,
  escapeRegex,
} = require('../../utilities/queryHelpers');

// Email regex pattern for validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// @desc    Subscribe new email to newsletter
// @route   POST /api/subscribers
const subscribe = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        status: httpStatusText.FAIL,
        message: 'Email address is required.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(cleanEmail)) {
      return res.status(400).json({
        status: httpStatusText.FAIL,
        message: 'Please provide a valid email address.',
      });
    }

    // Check if already subscribed
    const existing = await Subscriber.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({
        status: httpStatusText.FAIL,
        message: 'This email is already subscribed to the newsletter.',
      });
    }

    const subscriber = await Subscriber.create({ email: cleanEmail });

    res.status(201).json({
      status: httpStatusText.SUCCESS,
      message: 'Successfully subscribed to the newsletter!',
      data: {
        subscriber: {
          _id: subscriber._id,
          email: subscriber.email,
          subscribedAt: subscriber.subscribedAt,
        },
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        status: httpStatusText.FAIL,
        message: 'This email is already subscribed to the newsletter.',
      });
    }
    next(err);
  }
};

// @desc    Get all subscribers with pagination and search
// @route   GET /api/subscribers
const getAllSubscribers = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query, 20, 100);
    const filter = {};

    if (req.query.search && req.query.search.trim()) {
      const escaped = escapeRegex(req.query.search.trim());
      filter.email = { $regex: escaped, $options: 'i' };
    }

    const [subscribers, totalSubscribers] = await Promise.all([
      Subscriber.find(filter, { __v: false })
        .sort({ subscribedAt: -1 })
        .limit(limit)
        .skip(skip),
      Subscriber.countDocuments(filter),
    ]);

    res.status(200).json({
      status: httpStatusText.SUCCESS,
      data: {
        subscribers,
        pagination: formatPagination(totalSubscribers, page, limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a subscriber by ID
// @route   DELETE /api/subscribers/:id
const deleteSubscriber = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: httpStatusText.FAIL,
        message: 'Invalid subscriber ID format.',
      });
    }

    const subscriber = await Subscriber.findByIdAndDelete(id);

    if (!subscriber) {
      return res.status(404).json({
        status: httpStatusText.FAIL,
        message: 'Subscriber not found.',
      });
    }

    res.status(200).json({
      status: httpStatusText.SUCCESS,
      message: 'Subscriber deleted successfully.',
      data: null,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  subscribe,
  getAllSubscribers,
  deleteSubscriber,
};
