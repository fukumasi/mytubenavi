const Ajv = require("ajv");

const ajv = new Ajv({ strict: false });

function validateRequest(schema) {
  return (req, res, next) => {
    const validate = ajv.compile(schema);
    const valid = validate(req);
    if (!valid) {
      return res.status(400).json({ errors: validate.errors });
    }
    next();
  };
}

module.exports = {
  validateRequest,
};
