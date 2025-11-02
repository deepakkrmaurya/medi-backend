import express from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  getMe,
  updateProfile
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import {
  validateRegister,
//   validateLogin,
  handleValidationErrors
} from '../middleware/validation.js';


const router = express.Router();

// ✅ Register route with validation
router.post('/register', validateRegister, handleValidationErrors, register);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Please include a valid email"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  login
);

// ✅ Get logged-in user info
router.get('/me', protect, getMe);

// ✅ Update profile
router.put('/profile', protect, updateProfile);

export default router;
