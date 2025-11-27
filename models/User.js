const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      lowercase: true,
      trim: true 
    },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { 
      type: String, 
      enum: ['student', 'driver', 'admin'], 
      default: 'student' 
    },
    imageUrl: String,
    
    // --- NEW FIELDS FOR VERIFICATION ---
    isVerified: { 
      type: Boolean, 
      default: false // User cannot login until this is true
    },
    verificationCode: { 
      type: String, 
      select: false // Hide this from standard queries for security
    },
    verificationCodeExpires: { 
      type: Date, 
      select: false 
    }
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);