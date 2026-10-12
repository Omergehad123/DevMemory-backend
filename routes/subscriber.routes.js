const express = require('express');
const router = express.Router();
const subscriberController = require('../app/controllers/subscriber.controller');

router
  .route('/')
  .get(subscriberController.getAllSubscribers)
  .post(subscriberController.subscribe);

router
  .route('/:id')
  .delete(subscriberController.deleteSubscriber);

module.exports = router;
