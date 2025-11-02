import Bill from '../models/Bill.js';
import Medicine from '../models/Medicine.js';
import mongoose from 'mongoose';
import { generateBillPDF } from '../utils/pdfGenerator.js';

// @desc    Create new bill
// @route   POST /api/bills
// @access  Private
export const createBill = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { customerName, customerMobile, customerEmail, items, discount, tax, paymentMethod } = req.body;

    // Validate items and check stock
    for (const item of items) {
      const medicine = await Medicine.findOne({
        _id: item.medicine,
        userId: req.user.id
      }).session(session);

      if (!medicine) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: `Medicine not found: ${item.medicineName}`
        });
      }

      if (!medicine.canSell(item.quantity)) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${medicine.name}. Available: ${medicine.quantity}`
        });
      }

      if (medicine.isExpired) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Cannot sell expired medicine: ${medicine.name}`
        });
      }
    }

    // Create bill
    const billData = {
      customerName,
      customerMobile,
      customerEmail,
      items: items.map(item => ({
        medicine: item.medicine,
        medicineName: item.medicineName,
        batchNo: item.batchNo,
        quantity: item.quantity,
        price: item.price,
        mrp: item.mrp,
        discount: item.discount || 0
      })),
      discount: discount || 0,
      tax: tax || 0,
      paymentMethod: paymentMethod || 'Cash',
      userId: req.user.id
    };

    const bill = await Bill.create([billData], { session });

    await session.commitTransaction();

    // Populate the created bill
    const populatedBill = await Bill.findById(bill[0]._id)
      .populate('items.medicine', 'name batchNo');

    res.status(201).json({
      success: true,
      bill: populatedBill,
      message: 'Bill created successfully'
    });

  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({
      success: false,
      message: error.message
    });
  } finally {
    session.endSession();
  }
};

// @desc    Get all bills with pagination
// @route   GET /api/bills
// @access  Private
export const getBills = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10,
      startDate,
      endDate,
      customerName
    } = req.query;
    
    let query = { userId: req.user.id };
    
    // Date range filter
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // Customer name filter
    if (customerName) {
      query.customerName = { $regex: customerName, $options: 'i' };
    }
    
    const bills = await Bill.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('items.medicine', 'name category');
    
    const total = await Bill.countDocuments(query);
    
    res.json({
      success: true,
      bills,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single bill
// @route   GET /api/bills/:id
// @access  Private
export const getBill = async (req, res) => {
  try {
    const bill = await Bill.findOne({
      _id: req.params.id,
      userId: req.user.id
    }).populate('items.medicine', 'name category batchNo');
    
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found'
      });
    }
    
    res.json({
      success: true,
      bill
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Generate bill PDF
// @route   GET /api/bills/:id/pdf
// @access  Private
export const generatePDF = async (req, res) => {
  try {
    const bill = await Bill.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found'
      });
    }

    const pdfBuffer = await generateBillPDF(bill, req.user);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=bill-${bill.billNo}.pdf`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get sales statistics
// @route   GET /api/bills/stats/sales
// @access  Private
export const getSalesStats = async (req, res) => {
  try {
    const { period = '30days' } = req.query;
    
    let days;
    switch (period) {
      case '7days':
        days = 7;
        break;
      case '30days':
        days = 30;
        break;
      case '90days':
        days = 90;
        break;
      default:
        days = 30;
    }
    
    const dailySales = await Bill.getDailySales(req.user.id, days);
    
    const salesReport = await Bill.getSalesReport(
      req.user.id, 
      new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      new Date()
    );
    
    // Top selling medicines
    const topMedicines = await Bill.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.user.id),
          createdAt: { 
            $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) 
          }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.medicine',
          medicineName: { $first: '$items.medicineName' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.total' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 }
    ]);
    
    res.json({
      success: true,
      stats: {
        dailySales,
        salesReport: salesReport[0] || {},
        topMedicines
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};