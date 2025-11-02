import { body, validationResult } from 'express-validator';

/* ------------------ HANDLE VALIDATION ERRORS ------------------ */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

/* ------------------ AUTH VALIDATION ------------------ */
export const validateRegister = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),

  body('email')
    .trim()
    .isEmail()
    .withMessage('Please include a valid email')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),

  body('storeName')
    .notEmpty()
    .withMessage('Store name is required'),

  body('storeAddress')
    .notEmpty()
    .withMessage('Store address is required'),

  body('phone')
    .matches(/^[0-9]{10,15}$/)
    .withMessage('Please enter a valid phone number'),
];

export const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Please include a valid email')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

/* ------------------ MEDICINE VALIDATION ------------------ */
export const validateMedicine = [
  body('name').notEmpty().withMessage('Medicine name is required'),
  body('batchNo').notEmpty().withMessage('Batch number is required'),
  body('category')
    .isIn(['Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment', 'Drops', 'Inhaler', 'Other'])
    .withMessage('Please select a valid category'),
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a positive number'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('mrp').isFloat({ min: 0 }).withMessage('MRP must be a positive number'),
  body('discount')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Discount must be between 0 and 100'),
  body('expiryDate').isDate().withMessage('Please enter a valid expiry date'),
];

/* ------------------ BILL VALIDATION ------------------ */
export const validateBill = [
  body('customerName').notEmpty().withMessage('Customer name is required'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  body('items.*.medicine')
    .notEmpty()
    .withMessage('Medicine ID is required'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
];
