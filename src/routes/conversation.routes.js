const express = require('express');
const conversationController = require('../controllers/conversation.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { conversationParamSchema, paginationQuerySchema } = require('../validators');

const router = express.Router();

router.use(authenticate);

router.get('/', validate(paginationQuerySchema), (req, res, next) =>
  conversationController.getAll(req, res, next)
);

router.get('/:id', validate(conversationParamSchema), (req, res, next) =>
  conversationController.getById(req, res, next)
);

router.get('/:id/messages', validate(conversationParamSchema), (req, res, next) =>
  conversationController.getMessages(req, res, next)
);

router.delete('/:id', validate(conversationParamSchema), (req, res, next) =>
  conversationController.delete(req, res, next)
);

module.exports = router;
