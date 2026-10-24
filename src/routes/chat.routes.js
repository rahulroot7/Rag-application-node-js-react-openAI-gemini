const express = require('express');
const chatController = require('../controllers/chat.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { chatSchema } = require('../validators');

const router = express.Router();

router.use(authenticate);

router.post('/', validate(chatSchema), (req, res, next) =>
  chatController.chat(req, res, next)
);

module.exports = router;
