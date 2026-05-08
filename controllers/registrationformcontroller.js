const mongoose = require("mongoose");
const RegistrationForm = require("../models/registrationformModel");
const DoctorList = require("../models/doctorlistModel");

function sanitizeAppointmentPayload(body = {}) {
  return {
    name: String(body.name || "").trim(),
    email: String(body.email || "")
      .trim()
      .toLowerCase(),
    phonenumber: String(body.phonenumber || "").trim(),
    dateOfBirth: Date(body.dateOfBirth),
    address: String(body.address || "").trim(),
    description: String(body.description || "").trim(),
    doctorId: String(body.doctorId || "").trim(),
  };
}

const createAppointment = async (req, res) => {
  try {
    const payload = sanitizeAppointmentPayload(req.body);

    if (Object.values(payload).some((value) => !value)) {
      return res
        .status(400)
        .json({ error: "All appointment fields are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(payload.doctorId)) {
      return res.status(400).json({ error: "Invalid doctor ID" });
    }

    const doctor = await DoctorList.findById(payload.doctorId).select("name");
    if (!doctor) {
      return res.status(404).json({ error: "Doctor not found" });
    }

    const newAppointment = new RegistrationForm({
      ...payload,
      doctorId: doctor._id,
      doctorName: doctor.name,
      userId: req.body.userId || null,
    });
    await newAppointment.save();
    res
      .status(201)
      .json({
        message: "Appointment created successfully!",
        data: newAppointment,
      });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
const getAllAppointments = async (req, res) => {
  try {
    const appointments = await RegistrationForm.find()
      .populate("doctorId", "name specialty")
      .sort({ createdAt: -1 });
    res.status(200).json({ data: appointments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getMyAppointments = async (req, res) => {
  try {
    const appointments = await RegistrationForm.find({
      $or: [{ userId: req.user.userId }, { email: req.user.email }],
    })
      .populate("doctorId", "name specialty")
      .sort({ createdAt: -1 });

    res.status(200).json({ data: appointments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAppointmentById = async (req, res) => {
  try {
    const appointment = await RegistrationForm.findById(req.params.id).populate(
      "doctorId",
      "name specialty"
    );
    if (!appointment)
      return res.status(404).json({ error: "Appointment not found" });
    res.status(200).json({ data: appointment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateAppointment = async (req, res) => {
  try {
    const updatedAppointment = await RegistrationForm.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true }
    );
    if (!updatedAppointment)
      return res.status(404).json({ error: "Appointment not found" });
    res.status(200).json({
      message: "Appointment status updated successfully!",
      data: updatedAppointment,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteAppointment = async (req, res) => {
  try {
    const appointment = await RegistrationForm.findByIdAndDelete(req.params.id);
    if (!appointment)
      return res.status(404).json({ error: "Appointment not found" });
    res.status(200).json({ message: "Appointment deleted successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createAppointment,
  getAllAppointments,
  getMyAppointments,
  getAppointmentById,
  getAppointmentById,
  updateAppointment,
  deleteAppointment,
};
