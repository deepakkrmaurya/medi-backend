import Bill from '../models/Bill.js';
import Medicine from '../models/Medicine.js';
import { generateMedicinesExcel, generateSalesExcel } from '../utils/excelGenerator.js';

// @desc    Get sales report
// @route   GET /api/reports/sales
// @access  Private
export const getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }
    
    const matchStage = {
      userId: new mongoose.Types.ObjectId(req.user.id),
      createdAt: { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      }
    };
    
    let groupStage;
    switch (groupBy) {
      case 'day':
        groupStage = {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        };
        break;
      case 'week':
        groupStage = {
          $dateToString: { format: '%Y-%U', date: '$createdAt' }
        };
        break;
      case 'month':
        groupStage = {
          $dateToString: { format: '%Y-%m', date: '$createdAt' }
        };
        break;
      default:
        groupStage = {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        };
    }
    
    const salesData = await Bill.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: groupStage,
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          totalDiscount: { $sum: '$discount' },
          totalTax: { $sum: '$tax' },
          averageOrderValue: { $avg: '$total' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.json({
      success: true,
      report: {
        period: { startDate, endDate },
        salesData,
        summary: {
          totalPeriodSales: salesData.reduce((sum, day) => sum + day.totalSales, 0),
          totalPeriodRevenue: salesData.reduce((sum, day) => sum + day.totalRevenue, 0),
          totalPeriodDiscount: salesData.reduce((sum, day) => sum + day.totalDiscount, 0)
        }
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get inventory report
// @route   GET /api/reports/inventory
// @access  Private
export const getInventoryReport = async (req, res) => {
  try {
    const { category, stockStatus } = req.query;
    
    let query = { userId: req.user.id };
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (stockStatus) {
      if (stockStatus === 'outOfStock') {
        query.quantity = 0;
      } else if (stockStatus === 'lowStock') {
        query.quantity = { $lte: 5, $gt: 0 };
      } else if (stockStatus === 'inStock') {
        query.quantity = { $gt: 0 };
      }
    }
    
    const medicines = await Medicine.find(query).sort({ quantity: 1 });
    
    const inventoryValue = medicines.reduce((sum, med) => sum + (med.price * med.quantity), 0);
    const totalItems = medicines.length;
    const outOfStockCount = medicines.filter(med => med.quantity === 0).length;
    const lowStockCount = medicines.filter(med => med.quantity > 0 && med.quantity <= 5).length;
    
    res.json({
      success: true,
      report: {
        summary: {
          totalItems,
          inventoryValue,
          outOfStockCount,
          lowStockCount,
          inStockCount: totalItems - outOfStockCount
        },
        medicines
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Export medicines to Excel
// @route   GET /api/reports/export/medicines
// @access  Private
export const exportMedicinesToExcel = async (req, res) => {
  try {
    const medicines = await Medicine.find({ userId: req.user.id }).sort({ name: 1 });
    
    const workbook = generateMedicinesExcel(medicines);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=medicines-report.xlsx');
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Export sales to Excel
// @route   GET /api/reports/export/sales
// @access  Private
export const exportSalesToExcel = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }
    
    const bills = await Bill.find({
      userId: req.user.id,
      createdAt: { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      }
    }).sort({ createdAt: 1 });
    
    const workbook = generateSalesExcel(bills, startDate, endDate);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=sales-report-${startDate}-to-${endDate}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get expiry report
// @route   GET /api/reports/expiry
// @access  Private
export const getExpiryReport = async (req, res) => {
  try {
    const { months = 6 } = req.query;
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));
    
    const medicines = await Medicine.find({
      userId: req.user.id,
      expiryDate: { $gte: startDate, $lte: endDate }
    }).sort({ expiryDate: 1 });
    
    // Group by month
    const monthlyExpiry = medicines.reduce((acc, medicine) => {
      const month = medicine.expiryDate.toISOString().substring(0, 7); // YYYY-MM
      if (!acc[month]) {
        acc[month] = [];
      }
      acc[month].push(medicine);
      return acc;
    }, {});
    
    res.json({
      success: true,
      report: {
        period: { startDate, endDate },
        summary: {
          totalExpiring: medicines.length,
          monthlyBreakdown: Object.keys(monthlyExpiry).map(month => ({
            month,
            count: monthlyExpiry[month].length,
            medicines: monthlyExpiry[month]
          }))
        },
        medicines
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};