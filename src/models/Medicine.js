import mongoose from 'mongoose';

const medicineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add medicine name'],
    trim: true,
    index: true
  },
  image: {
    type: String,
    required: [true, 'Please add medicine image Url'],
  },
  batchNo: {
    type: String,
    required: [true, 'Please add batch number'],
    uppercase: true
  },
  category: {
    type: String,
    required: [true, 'Please add category'],
    enum: ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment', 'Drops', 'Inhaler', 'Other'],
    index: true
  },
  quantity: {
    type: Number,
    required: [true, 'Please add quantity'],
    min: 0
  },
  price: {
    type: Number,
    required: [true, 'Please add price'],
    min: 0
  },
  mrp: {
    type: Number,
    required: [true, 'Please add MRP'],
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  expiryDate: {
    type: Date,
    required: [true, 'Please add expiry date']
  },
  addedDate: {
    type: Date,
    default: Date.now
  },
  lowStockAlert: {
    type: Number,
    default: 5
  },
  supplier: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
medicineSchema.index({ expiryDate: 1 });
medicineSchema.index({ userId: 1, name: 1 });
medicineSchema.index({ userId: 1, category: 1 });
medicineSchema.index({ userId: 1, quantity: 1 });

// Virtual for expiry status
medicineSchema.virtual('isExpired').get(function() {
  return this.expiryDate < new Date();
});

// Virtual for low stock status
medicineSchema.virtual('isLowStock').get(function() {
  return this.quantity <= this.lowStockAlert && this.quantity > 0;
});

// Virtual for expiring soon status (within 30 days)
medicineSchema.virtual('expiringSoon').get(function() {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  return this.expiryDate <= thirtyDaysFromNow && this.expiryDate > new Date();
});

// Virtual for out of stock status
medicineSchema.virtual('isOutOfStock').get(function() {
  return this.quantity === 0;
});

// Method to check if medicine can be sold
medicineSchema.methods.canSell = function(quantity) {
  return this.quantity >= quantity && !this.isExpired;
};

// Static method to get medicines by expiry status
medicineSchema.statics.getByExpiryStatus = function(userId, status) {
  const today = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(today.getDate() + 30);

  let query = { userId };

  switch (status) {
    case 'expired':
      query.expiryDate = { $lt: today };
      break;
    case 'expiring':
      query.expiryDate = { $gte: today, $lte: thirtyDaysFromNow };
      break;
    case 'safe':
      query.expiryDate = { $gt: thirtyDaysFromNow };
      break;
    default:
      break;
  }

  return this.find(query);
};

export default mongoose.model('Medicine', medicineSchema);