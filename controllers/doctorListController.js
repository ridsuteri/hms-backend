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

const getAllDoctors = (req, res) => {};

module.exports = { createDoctor, getAllDoctors };
