const client = require("../config/redis");
const DoctorList = require("../models/doctorlistModel");
function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function sanitizeDoctor(doctor) {
  return {
    id: doctor._id,
    name: doctor.name,
    email: doctor.email,
    specialty: doctor.specialty,
    phonenumber: doctor.phonenumber,
    dateOfBirth: doctor.dateOfBirth,
    address: doctor.address,
    availability: doctor.availability,
    degree: doctor.degree,
    createdAt: doctor.createdAt,
    updatedAt: doctor.updatedAt,
  };
}
function sanitizeDoctorPayload(body = {}) {
  return {
    name: String(body.name || "").trim(),
    specialty: String(body.specialty || "").trim(),
    phonenumber: String(body.phonenumber || "").trim(),
    dateOfBirth: body.dateOfBirth,
    address: String(body.address || "").trim(),
    email: String(body.email || "")
      .trim()
      .toLowerCase(),
    availability: String(body.availability || "").trim(),
    degree: String(body.degree || "").trim(),
  };
}

const createDoctor = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const name = String(req.body.name || "").trim();
    const specialty = String(req.body.specialty || "").trim();
    const phonenumber = String(req.body.phonenumber || "").trim();
    const dateOfBirth = String(req.body.dateOfBirth || "").trim();
    const address = String(req.body.address || "").trim();
    const availability = String(req.body.availability || "").trim();
    const degree = String(req.body.degree || "").trim();

    if (
      !name ||
      !email ||
      !specialty ||
      !phonenumber ||
      !dateOfBirth ||
      !address ||
      !availability ||
      !degree
    ) {
      return res
        .status(400)
        .json({ error: "Please fill all the mandatory fields" });
    }

    const existingDoctor = await DoctorList.findOne({ email });
    if (existingDoctor) {
      return res.status(400).json({ error: "Doctor already exists" });
    }

    const doctor = new DoctorList({
      email,
      name,
      specialty,
      phonenumber,
      dateOfBirth,
      address,
      availability,
      degree,
    });

    await doctor.save();
    res.status(201).json({
      message: "Doctor created successfully",
      data: { doctor: sanitizeDoctor(doctor) },
    });
  } catch (error) {
    console.error("Error creating Doctor:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getAllDoctors = async (req, res) => {
  try {
    // try with redis first
    const cache = await client.get('doctors:all');

    if(cache){
      console.log('cache exists, fetching data from cache', cache)
      res.status(200).json({ data: JSON.parse(cache), source: 'cache' });
      return;
    }

    const doctors = await DoctorList.find();
    console.log('cache miss, setting data to cache', doctors)
    await client.set('doctors:all', JSON.stringify(doctors));

    res.status(200).json({ data: doctors, source: 'db' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getDoctorById = async (req, res) => {
  try {
    const doctor = await DoctorList.findById(req.params.id);
    if (!doctor) return res.status(404).json({ error: "Doctor not found" });
    res.status(200).json({ data: doctor });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateDoctor = async (req, res) => {
  try {
    const payload = sanitizeDoctorPayload(req.body);
    const doctor = await DoctorList.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });
    if (!doctor) return res.status(404).json({ error: "Doctor not found" });
    res
      .status(200)
      .json({ message: "Doctor updated successfully", data: doctor });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteDoctor = async (req, res) => {
  try {
    const doctor = await DoctorList.findByIdAndDelete(req.params.id);
    if (!doctor) return res.status(404).json({ error: "Doctor not found" });
    res.status(200).json({ message: "Doctor deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createDoctor,
  getAllDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
};
