const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    username: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    phone: { type: String, unique: true, sparse: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['landlord', 'tenant', 'admin'], default: 'tenant' },
    isBlocked: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    avatarUrl: { type: String },

    verificationStatus: {
        idVerified: { type: Boolean, default: false },
        faceMatched: { type: Boolean, default: false },
        status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
        idData: {
            name: String,
            idNumber: String,
            birthDate: String
        },
        uploadedIdUrl: String,
        selfieUrl: String
    }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
