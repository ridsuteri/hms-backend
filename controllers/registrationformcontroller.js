const RegistrationForm = require('../models/registrationformModel');

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function sanitizeAppointment(appointment) {
  return {
    id: appointment._id,
    name: appointment.name,
    email: appointment.email,
    doctorName: appointment.doctorName,
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt,
  };
}

const createAppointment = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const name = String(req.body.name || "").trim();
    const phonenumber = String(req.body.phonenumber || "").trim();
    const dateOfBirth = Date(req.body.dateOfBirth || "").trim();
    const address = String(req.body.address || "").trim();
    const description = String(req.body.description || "").trim();
    const doctorId = String(req.body.doctorId || "").trim();
    const doctorName = String(req.body.doctorName || "").trim();
    const userId = String(req.body.userId || "").trim();

    if (
      !name ||
      !email ||
      !description ||
      !phonenumber ||
      !dateOfBirth ||
      !address ||
      !doctorId ||
      !doctorName ||
      !userId
    ) {
      return res
        .status(400)
        .json({ error: "Please fill all the mandatory fields" });
    }


    const appointment = new RegistrationForm({
      email,
      name,
      description,
      phonenumber,
      dateOfBirth,
      address,
      doctorId,
      doctorName,
      userId
    });

    await appointment.save();
    res.status(201).json({
      message: "Appointment created successfully",
      data: { appointment: sanitizeAppointment(appointment) },
    });
  } catch (error) {
    console.error("Error creating Appointment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {createAppointment};
