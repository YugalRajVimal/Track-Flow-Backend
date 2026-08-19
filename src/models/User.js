const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    passcode: {
      type: String,
      required: [true, 'Passcode is required'],
      match: [/^\d{5}$/, 'Passcode must be exactly 5 digits'],
      select: false,
    },
    verificationPassscode: {
      type: String,
      required: false,
      match: [/^\d{5}$/, 'VerificationPassscode must be exactly 5 digits'],
      select: false,
    },
    paymentDepartmentPasscode: {
      type: String,
      required: false,
      match: [/^[a-zA-Z0-9]{5,16}$/, 'paymentDepartmentPasscode must be 5-16 alphanumeric characters'],
      select: false,
    },
    // Add costManagementPasscode field as a 5 digit number (like passcode)
    costManagementPasscode: {
      type: String,
      required: false,
      match: [/^\d{5}$/, 'Cost Management Passcode must be exactly 5 digits'],
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'stitching-factory', 'dying-factory', 'printing-factory'],
      default: 'user',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.passcode;
        delete ret.paymentDepartmentPasscode;
        delete ret.verificationPassscode;
        delete ret.costManagementPasscode;
        return ret;
      },
    },
  }
);

// Hash password, passcode, paymentDepartmentPasscode, verificationPassscode, and costManagementPasscode if modified
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  if (this.isModified('passcode')) {
    this.passcode = await bcrypt.hash(this.passcode, 12);
  }
  if (this.isModified('verificationPassscode') && this.verificationPassscode) {
    this.verificationPassscode = await bcrypt.hash(this.verificationPassscode, 12);
  }
  if (this.isModified('paymentDepartmentPasscode') && this.paymentDepartmentPasscode) {
    this.paymentDepartmentPasscode = await bcrypt.hash(this.paymentDepartmentPasscode, 12);
  }
  if (this.isModified('costManagementPasscode') && this.costManagementPasscode) {
    this.costManagementPasscode = await bcrypt.hash(this.costManagementPasscode, 12);
  }
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.comparePasscode = async function (candidatePasscode) {
  return bcrypt.compare(candidatePasscode, this.passcode);
};

userSchema.methods.compareVerificationPassscode = async function (candidateVerificationPassscode) {
  if (!this.verificationPassscode) return false;
  return bcrypt.compare(candidateVerificationPassscode, this.verificationPassscode);
};

userSchema.methods.comparePaymentDepartmentPasscode = async function (candidatePDPasscode) {
  if (!this.paymentDepartmentPasscode) return false;
  return bcrypt.compare(candidatePDPasscode, this.paymentDepartmentPasscode);
};

// Method to compare costManagementPasscode
userSchema.methods.compareCostManagementPasscode = async function (candidateCostManagementPasscode) {
  if (!this.costManagementPasscode) return false;
  return bcrypt.compare(candidateCostManagementPasscode, this.costManagementPasscode);
};

module.exports = mongoose.model('User', userSchema);
