const mongoose = require('mongoose');

const registrationFormSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Auth', default: null },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phonenumber: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date, required: true },
    address: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'DoctorList', required: true },
    doctorName: { type: String, required: true, trim: true },
    status: { type: String, default: 'Pending', required: true }
},{ timestamps: true });

const RegistrationForm = mongoose.model('RegistrationForm', registrationFormSchema);
module.exports = RegistrationForm;
