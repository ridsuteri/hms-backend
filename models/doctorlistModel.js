const mongoose = require('mongoose');

const doctorList = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    specialty: { type: String, required: true, trim: true },
    phonenumber: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date, required: true },
    address: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    availability: { type: String, required: true, trim: true },
    degree: { type: String, required: true, trim: true }

},{ timestamps: true });

const DoctorList = mongoose.model('DoctorList', doctorList);
module.exports = DoctorList;
