import express from 'express';
import {
  getMedicines,
  getMedicine,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  getExpiryMedicines,
  getDashboardStats,
  bulkUpdateMedicines,
  getLowStockMedicines,
  getOutOfStockMedicines,
  searchMedicines,
  getMedicineCategories,
  upload
} from '../controllers/medicineController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getMedicines)
  .post(createMedicine);

router.route('/search')
  .get(searchMedicines);

router.route('/categories')
  .get(getMedicineCategories);

router.route('/expiry')
  .get(getExpiryMedicines);

router.route('/dashboard/stats')
  .get(getDashboardStats);

router.route('/stock/low')
  .get(getLowStockMedicines);

router.route('/stock/out')
  .get(getOutOfStockMedicines);

router.route('/bulk/update')
  .put(bulkUpdateMedicines);

router.route('/:id')
  .get(getMedicine)
  .put(updateMedicine)
  .delete(deleteMedicine);

export default router;