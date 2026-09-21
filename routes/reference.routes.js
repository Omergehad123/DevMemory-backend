const express = require('express');
const router = express.Router();
const referenceController = require('../app/controllers/reference.controller');

router
  .route('/')
  .get(referenceController.getAllReferences)
  .post(referenceController.createReference);

router
  .route('/:id')
  .get(referenceController.getReferenceById)
  .patch(referenceController.updateReference)
  .delete(referenceController.deleteReference);

module.exports = router;
