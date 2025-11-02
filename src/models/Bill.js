import mongoose from 'mongoose';

const billItemSchema = new mongoose.Schema({
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    required: true
  },
  medicineName: {
    type: String,
    required: true
  },
  batchNo: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  mrp: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  total: {
    type: Number,
    required: true,
    min: 0
  }
});

const billSchema = new mongoose.Schema({
  billNo: {
    type: String,
    required: true,
    unique: true
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  customerMobile: {
    type: String,
    trim: true
  },
  customerEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  items: [billItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Card', 'UPI', 'Online'],
    default: 'Cash'
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Completed', 'Failed'],
    default: 'Completed'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Generate bill number before saving
billSchema.pre('save', async function(next) {
  if (!this.billNo) {
    const count = await mongoose.model('Bill').countDocuments();
    this.billNo = `BILL-${String(count + 1).padStart(6, '0')}`;
  }

  // Calculate item totals
  this.items.forEach(item => {
    item.total = item.price * item.quantity * (1 - item.discount / 100);
  });

  // Calculate bill totals
  this.subtotal = this.items.reduce((sum, item) => sum + item.total, 0);
  this.total = this.subtotal - this.discount + this.tax;

  next();
});

// Update medicine quantities after bill is created
billSchema.post('save', async function() {
  for (const item of this.items) {
    await mongoose.model('Medicine').findByIdAndUpdate(
      item.medicine,
      { $inc: { quantity: -item.quantity } }
    );
  }
});

// Static method to get sales report
billSchema.statics.getSalesReport = function(userId, startDate, endDate) {
  const matchStage = {
    userId: new mongoose.Types.ObjectId(userId),
    createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
  };

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalSales: { $sum: 1 },
        totalRevenue: { $sum: '$total' },
        totalDiscount: { $sum: '$discount' },
        totalTax: { $sum: '$tax' },
        averageOrderValue: { $avg: '$total' }
      }
    }
  ]);
};

// Static method to get daily sales
billSchema.statics.getDailySales = function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        totalSales: { $sum: 1 },
        totalRevenue: { $sum: '$total' },
        date: { $first: '$createdAt' }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

export default mongoose.model('Bill', billSchema);