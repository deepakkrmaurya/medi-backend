import Medicine from '../models/Medicine.js';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/medicines/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'medicine-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// @desc    Get all medicines with filtering and pagination
// @route   GET /api/medicines
// @access  Private
export const getMedicines = async (req, res) => {
  try {
    const { 
      category, 
      stockStatus, 
      search, 
      page = 1, 
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    let query = { userId: req.user.id };
    
    // Category filter
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // Stock status filter
    if (stockStatus) {
      if (stockStatus === 'outOfStock') {
        query.quantity = 0;
      } else if (stockStatus === 'lowStock') {
        query.quantity = { $lte: 5, $gt: 0 };
      } else if (stockStatus === 'inStock') {
        query.quantity = { $gt: 0 };
      }
    }
    
    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { batchNo: { $regex: search, $options: 'i' } },
        { supplier: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Sort configuration
    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const medicines = await Medicine.find(query)
      .sort(sortConfig)
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Medicine.countDocuments(query);
    
    res.json({
      success: true,
      medicines,
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

// @desc    Get single medicine
// @route   GET /api/medicines/:id
// @access  Private
export const getMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findOne({
      _id: req.params.id,
      userId: req.user.id
    });
    
    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found'
      });
    }
    
    res.json({
      success: true,
      medicine
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create new medicine with file upload
// @route   POST /api/medicines
// @access  Private
export const createMedicine = [
  upload.single('image'),
  async (req, res) => {
    console.log(req.files)
    try {
      const {
        name,
        batchNo,
        category,
        quantity,
        price,
        mrp,
        discount,
        expiryDate,
        lowStockAlert,
        supplier,
        description
      } = req.body;

      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Please upload a medicine image'
        });
      }

      // Check if medicine with same batch no already exists for this user
      const existingMedicine = await Medicine.findOne({
        batchNo: batchNo,
        userId: req.user.id
      });

      if (existingMedicine) {
        return res.status(400).json({
          success: false,
          message: 'Medicine with this batch number already exists'
        });
      }

      const medicine = new Medicine({
        name,
        image: `/uploads/medicines/${req.file.filename}`,
        batchNo,
        category,
        quantity: parseInt(quantity),
        price: parseFloat(price),
        mrp: parseFloat(mrp),
        discount: parseFloat(discount) || 0,
        expiryDate,
        lowStockAlert: parseInt(lowStockAlert) || 5,
        supplier,
        description,
        userId: req.user.id
      });

      await medicine.save();

      res.status(201).json({
        success: true,
        message: 'Medicine added successfully',
        medicine
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
];

// @desc    Update medicine with optional file upload
// @route   PUT /api/medicines/:id
// @access  Private
export const updateMedicine = [
  upload.single('image'),
  async (req, res) => {
    try {
      const {
        name,
        batchNo,
        category,
        quantity,
        price,
        mrp,
        discount,
        expiryDate,
        lowStockAlert,
        supplier,
        description
      } = req.body;

      let medicine = await Medicine.findOne({
        _id: req.params.id,
        userId: req.user.id
      });
      
      if (!medicine) {
        return res.status(404).json({
          success: false,
          message: 'Medicine not found'
        });
      }

      // Check if batch number is being changed and if it conflicts
      if (batchNo && batchNo !== medicine.batchNo) {
        const existingMedicine = await Medicine.findOne({
          batchNo: batchNo,
          userId: req.user.id,
          _id: { $ne: req.params.id }
        });

        if (existingMedicine) {
          return res.status(400).json({
            success: false,
            message: 'Another medicine with this batch number already exists'
          });
        }
      }

      const updateData = {
        name,
        batchNo,
        category,
        quantity: parseInt(quantity),
        price: parseFloat(price),
        mrp: parseFloat(mrp),
        discount: parseFloat(discount) || 0,
        expiryDate,
        lowStockAlert: parseInt(lowStockAlert) || 5,
        supplier,
        description
      };

      // If new image uploaded, update image path
      if (req.file) {
        updateData.image = `/uploads/medicines/${req.file.filename}`;
      }
      
      medicine = await Medicine.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      );
      
      res.json({
        success: true,
        message: 'Medicine updated successfully',
        medicine
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
];

// @desc    Delete medicine
// @route   DELETE /api/medicines/:id
// @access  Private
export const deleteMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findOne({
      _id: req.params.id,
      userId: req.user.id
    });
    
    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found'
      });
    }
    
    await Medicine.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Medicine deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get expiry medicines
// @route   GET /api/medicines/expiry
// @access  Private
export const getExpiryMedicines = async (req, res) => {
  try {
    const { type } = req.query;
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    let query = { userId: req.user.id };
    
    if (type === 'expired') {
      query.expiryDate = { $lt: today };
    } else if (type === 'expiring') {
      query.expiryDate = { 
        $gte: today, 
        $lte: thirtyDaysFromNow 
      };
    }
    
    const medicines = await Medicine.find(query).sort({ expiryDate: 1 });
    
    res.json({
      success: true,
      medicines,
      count: medicines.length
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/medicines/dashboard/stats
// @access  Private
export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    const totalMedicines = await Medicine.countDocuments({ userId });
    
    const totalStock = await Medicine.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);
    
    const expiringMedicines = await Medicine.countDocuments({
      userId,
      expiryDate: { $gte: today, $lte: thirtyDaysFromNow }
    });
    
    const expiredMedicines = await Medicine.countDocuments({
      userId,
      expiryDate: { $lt: today }
    });
    
    const outOfStockMedicines = await Medicine.countDocuments({
      userId,
      quantity: 0
    });
    
    const lowStockMedicines = await Medicine.countDocuments({
      userId,
      quantity: { $lte: 5, $gt: 0 }
    });
    
    // Category distribution
    const categoryStats = await Medicine.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' }
        }
      }
    ]);
    
    res.json({
      success: true,
      stats: {
        totalMedicines,
        totalStock: totalStock[0]?.total || 0,
        expiringMedicines,
        expiredMedicines,
        outOfStockMedicines,
        lowStockMedicines,
        categoryStats
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Bulk update medicines
// @route   PUT /api/medicines/bulk/update
// @access  Private
export const bulkUpdateMedicines = async (req, res) => {
  try {
    const { medicines } = req.body;
    
    const updateOperations = medicines.map(medicine => ({
      updateOne: {
        filter: { 
          _id: medicine._id, 
          userId: req.user.id 
        },
        update: { $set: medicine }
      }
    }));
    
    const result = await Medicine.bulkWrite(updateOperations);
    
    res.json({
      success: true,
      message: `${result.modifiedCount} medicines updated successfully`,
      result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get low stock medicines
// @route   GET /api/medicines/stock/low
// @access  Private
export const getLowStockMedicines = async (req, res) => {
  try {
    const medicines = await Medicine.find({
      userId: req.user.id,
      quantity: { $lte: 5, $gt: 0 }
    }).sort({ quantity: 1 });
    
    res.json({
      success: true,
      medicines,
      count: medicines.length
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get out of stock medicines
// @route   GET /api/medicines/stock/out
// @access  Private
export const getOutOfStockMedicines = async (req, res) => {
  try {
    const medicines = await Medicine.find({
      userId: req.user.id,
      quantity: 0
    }).sort({ name: 1 });
    
    res.json({
      success: true,
      medicines,
      count: medicines.length
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Search medicines
// @route   GET /api/medicines/search
// @access  Private
export const searchMedicines = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    
    const medicines = await Medicine.find({
      userId: req.user.id,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { batchNo: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
        { supplier: { $regex: q, $options: 'i' } }
      ]
    }).limit(20);
    
    res.json({
      success: true,
      medicines,
      count: medicines.length
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get medicine categories
// @route   GET /api/medicines/categories
// @access  Private
export const getMedicineCategories = async (req, res) => {
  try {
    const categories = await Medicine.distinct('category', { 
      userId: req.user.id 
    });
    
    res.json({
      success: true,
      categories
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};