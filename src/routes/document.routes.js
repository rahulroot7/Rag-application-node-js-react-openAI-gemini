const express = require('express');
const documentController = require('../controllers/document.controller');
const authenticate = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const validate = require('../middleware/validate.middleware');
const { documentParamSchema, paginationQuerySchema } = require('../validators');

const router = express.Router();

router.post(
  '/',
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) return next(err);
      next();
    });
  },
  authenticate,
  (req, res, next) => documentController.upload(req, res, next)
);

// Apply auth to remaining document routes
router.use(authenticate);

router.get('/', validate(paginationQuerySchema), (req, res, next) =>
  documentController.getAll(req, res, next)
);

router.get('/:id', validate(documentParamSchema), (req, res, next) =>
  documentController.getById(req, res, next)
);

router.get('/:id/status', validate(documentParamSchema), (req, res, next) =>
  documentController.getStatus(req, res, next)
);

router.delete('/:id', validate(documentParamSchema), (req, res, next) =>
  documentController.delete(req, res, next)
);

module.exports = router;
