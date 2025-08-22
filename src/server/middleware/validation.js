const Joi = require('joi');

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details[0].message
      });
    }
    next();
  };
};

const schemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().min(1).required(),
    lastName: Joi.string().min(1).required()
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  project: Joi.object({
    name: Joi.string().min(1).max(255).required(),
    description: Joi.string().max(2000).allow(''),
    tags: Joi.array().items(Joi.string().max(50)).max(10)
  }),

  conversation: Joi.object({
    title: Joi.string().min(1).max(255).required(),
    aiProvider: Joi.string().valid('openai', 'anthropic', 'google', 'mistral', 'other').required(),
    modelVersion: Joi.string().max(100).allow('')
  }),

  message: Joi.object({
    role: Joi.string().valid('user', 'assistant', 'system').required(),
    content: Joi.string().required(),
    rawContent: Joi.string().allow(''),
    metadata: Joi.object()
  }),

  messageBatch: Joi.object({
    messages: Joi.array().items(
      Joi.object({
        role: Joi.string().valid('user', 'assistant', 'system').required(),
        content: Joi.string().required(),
        rawContent: Joi.string().allow(''),
        metadata: Joi.object()
      })
    ).min(1).max(100).required()
  })
};

module.exports = {
  validate,
  schemas
};