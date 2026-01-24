/**
 * Validation Middleware
 * Request validation using express-validator
 */

const { body, param, query, validationResult } = require("express-validator");

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }

  next();
};

/**
 * User registration validation rules
 */
const registerValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ max: 50 })
    .withMessage("Name cannot exceed 50 characters"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),

  handleValidationErrors,
];

/**
 * User login validation rules
 */
const loginValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),

  body("password").notEmpty().withMessage("Password is required"),

  handleValidationErrors,
];

/**
 * Task creation validation rules
 */
const createTaskValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Task title is required")
    .isLength({ max: 200 })
    .withMessage("Title cannot exceed 200 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Description cannot exceed 1000 characters"),

  body("estimatedDuration")
    .notEmpty()
    .withMessage("Estimated duration is required")
    .isInt({ min: 5, max: 480 })
    .withMessage("Duration must be between 5 and 480 minutes"),

  body("deadline")
    .notEmpty()
    .withMessage("Deadline is required")
    .isISO8601()
    .withMessage("Deadline must be a valid date")
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error("Deadline must be in the future");
      }
      return true;
    }),

  body("priority")
    .optional()
    .isIn(["low", "medium", "high"])
    .withMessage("Priority must be low, medium, or high"),

  body("flexibility")
    .optional()
    .isIn(["fixed", "movable"])
    .withMessage("Flexibility must be fixed or movable"),

  body("energyLevel")
    .optional()
    .isIn(["low-focus", "deep-focus"])
    .withMessage("Energy level must be low-focus or deep-focus"),

  handleValidationErrors,
];

/**
 * Task update validation rules
 */
const updateTaskValidation = [
  param("id").isMongoId().withMessage("Invalid task ID"),

  body("title")
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Title must be between 1 and 200 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Description cannot exceed 1000 characters"),

  body("estimatedDuration")
    .optional()
    .isInt({ min: 5, max: 480 })
    .withMessage("Duration must be between 5 and 480 minutes"),

  body("deadline")
    .optional()
    .isISO8601()
    .withMessage("Deadline must be a valid date"),

  body("priority")
    .optional()
    .isIn(["low", "medium", "high"])
    .withMessage("Priority must be low, medium, or high"),

  body("flexibility")
    .optional()
    .isIn(["fixed", "movable"])
    .withMessage("Flexibility must be fixed or movable"),

  body("energyLevel")
    .optional()
    .isIn(["low-focus", "deep-focus"])
    .withMessage("Energy level must be low-focus or deep-focus"),

  body("isCompleted")
    .optional()
    .isBoolean()
    .withMessage("isCompleted must be a boolean"),

  body("actualDuration")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Actual duration must be a positive integer"),

  handleValidationErrors,
];

/**
 * User settings update validation
 */
const updateSettingsValidation = [
  body("workingHours.start")
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Start time must be in HH:MM format"),

  body("workingHours.end")
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("End time must be in HH:MM format"),

  body("maxDeepFocusMinutes")
    .optional()
    .isInt({ min: 30, max: 720 })
    .withMessage("Deep focus time must be between 30 and 720 minutes"),

  body("bufferMinutes")
    .optional()
    .isInt({ min: 0, max: 60 })
    .withMessage("Buffer must be between 0 and 60 minutes"),

  body("timezone")
    .optional()
    .isString()
    .withMessage("Timezone must be a string"),

  handleValidationErrors,
];

/**
 * MongoDB ObjectId validation
 */
const mongoIdValidation = [
  param("id").isMongoId().withMessage("Invalid ID format"),

  handleValidationErrors,
];

/**
 * Date query validation for schedule
 */
const scheduleDateValidation = [
  query("date")
    .optional()
    .isISO8601()
    .withMessage("Date must be in valid ISO format"),

  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  registerValidation,
  loginValidation,
  createTaskValidation,
  updateTaskValidation,
  updateSettingsValidation,
  mongoIdValidation,
  scheduleDateValidation,
};
