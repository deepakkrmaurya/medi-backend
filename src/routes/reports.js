import express from 'express';
import {
  getSalesReport,
  getInventoryReport,
  getExpiryReport,
  exportMedicinesToExcel,
  exportSalesToExcel
} from '../controllers/reportController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Protect all routes
router.use(protect);

router.get('/sales', getSalesReport);
router.get('/inventory', getInventoryReport);
router.get('/expiry', getExpiryReport);
router.get('/export/medicines', exportMedicinesToExcel);
router.get('/export/sales', exportSalesToExcel);

export default router;