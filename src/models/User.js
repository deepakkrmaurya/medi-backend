import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  storeName: {
    type: String,
    required: [true, 'Please add a store name'],
    trim: true,
    maxlength: [100, 'Store name cannot be more than 100 characters']
  },
  storeAddress: {
    type: String,
    required: [true, 'Please add store address'],
    maxlength: [200, 'Address cannot be more than 200 characters']
  },
  phone: {
    type: String,
    required: [true, 'Please add phone number'],
    match: [/^[0-9]{10,15}$/, 'Please add a valid phone number']
  },
  gstNumber: {
    type: String,
    trim: true
  },
  logo: {
    type: String
  },
  role: {
    type: String,
    enum: ['owner', 'staff'],
    default: 'owner'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Encrypt password using bcrypt
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS));
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Cascade delete medicines and bills when user is deleted
userSchema.pre('remove', async function(next) {
  await this.model('Medicine').deleteMany({ userId: this._id });
  await this.model('Bill').deleteMany({ userId: this._id });
  next();
});

export default mongoose.model('User', userSchema);