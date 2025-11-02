import express from 'express';
import {
  createBill,
  getBills,
  getBill,
  generatePDF,
  getSalesStats
} from '../controllers/billController.js';
import { protect } from '../middleware/auth.js';
import { 
  validateBill, 
  handleValidationErrors 
} from '../middleware/validation.js';

const router = express.Router();

// Protect all routes
router.use(protect);

router.get('/stats/sales', getSalesStats);
router.get('/:id/pdf', generatePDF);

router.route('/')
  .get(getBills)
  .post(validateBill, handleValidationErrors, createBill);

router.route('/:id')
  .get(getBill);

export default router;