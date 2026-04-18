# High-Level Design (HLD) — HealthCare Management System

> A learning-oriented architecture document for intermediate backend developers.
> This document explains **what** the system does, **how** the pieces connect, and **why** each decision matters.

---

## 1. System Context Diagram

Who talks to whom?

```
 +-----------+         HTTPS / REST           +---------------------+
 |  Patient  | ---------------------------->  |                     |
 |  Browser  | <----------------------------  |                     |
 +-----------+        JSON + JWT Token        |                     |
                                              |   Express.js API    |
 +-----------+         HTTPS / REST           |     Server          |        +-------------+
 |   Admin   | ---------------------------->  |   (Node.js)         | <----> |  MongoDB     |
 |  Browser  | <----------------------------  |                     |        |  (Atlas /    |
 +-----------+        JSON + JWT Token        |                     |        |   Local)     |
                                              +----------+----------+        +-------------+
                                                         |
                                                         | SMTP
                                                         v
                                                  +--------------+
                                                  |   Gmail /    |
                                                  |  Nodemailer  |
                                                  +--------------+
```

**Three external boundaries:**
1. **Client <-> Server** — REST API over HTTP, authenticated via JWT Bearer tokens
2. **Server <-> Database** — Mongoose ODM over MongoDB wire protocol
3. **Server <-> Email** — SMTP via Nodemailer (Gmail) for admin OTP delivery

---

## 2. Layered Architecture Diagram

The codebase follows a **3-layer MVC pattern**. Every request flows top-to-bottom through these layers:

```
  ┌─────────────────────────────────────────────────────────────┐
  │                      CLIENT (Browser)                       │
  │         HTML/CSS/JS  —  fetch() calls to REST API           │
  └──────────────────────────┬──────────────────────────────────┘
                             │  HTTP Request
                             v
  ┌─────────────────────────────────────────────────────────────┐
  │                     EXPRESS SERVER                          │
  │                                                             │
  │  server.js ─── App Bootstrap                                │
  │    ├── cors()              ← Cross-origin config            │
  │    ├── express.json()      ← Body parser                    │
  │    ├── express.static()    ← Serve frontend HTML/CSS        │
  │    └── Route mounting      ← Wire URL prefixes to routers   │
  └──────────────────────────┬──────────────────────────────────┘
                             │
                             v
  ┌─────────────────────────────────────────────────────────────┐
  │              LAYER 1: ROUTES  (Routes/*.js)                 │
  │                                                             │
  │  Define URL endpoints & HTTP methods                        │
  │  Attach middleware (auth guards) to routes                  │
  │  Delegate to controller functions                           │
  └──────────────────────────┬──────────────────────────────────┘
                             │
                             v
  ┌─────────────────────────────────────────────────────────────┐
  │           LAYER 2: CONTROLLERS  (Controllers/*.js)          │
  │                                                             │
  │  Business logic lives here:                                 │
  │    - Validate input                                         │
  │    - Call Models to read/write DB                           │
  │    - Hash passwords, generate tokens, send emails           │
  │    - Format and return HTTP responses                       │
  │                                                             │
  └──────────────────────────┬──────────────────────────────────┘
                             │
                             v
  ┌─────────────────────────────────────────────────────────────┐
  │            LAYER 3: MODELS  (Models/*.js)                   │
  │                                                             │
  │  Mongoose schemas = the shape of your data + DB hooks       │
  │                                                             │
  │  userModels.js ──────── Auth (email, name, hashed password) │
  │  adminAuthModels.js ─── AdminAuth (email, name, otp)        │
  │  registrationformModel.js ── RegistrationForm (appointment) │
  │  doctorlistModel.js ──────── DoctorList (doctor profile)    │
  └──────────────────────────┬──────────────────────────────────┘
                             │
                             v
                     ┌──────────────┐
                     │   MongoDB    │
                     └──────────────┘
```

**Why this layering matters (learning note):**
- **Separation of concerns** — Routes don't know about MongoDB. Models don't know about HTTP status codes.
- **Testability** — You can unit-test a controller by mocking the Model layer.
- **Replaceability** — Swap MongoDB for PostgreSQL? Only the Model layer changes.

---

## 3. Component Breakdown

### 3.1 Authentication Components

```
┌──────────────────────────────────────────────────────────┐
│                AUTHENTICATION SUBSYSTEM                  │
│                                                          │
│  ┌──────────────────┐      ┌────────────────────────┐    │
│  │  User Auth       │      │  Admin Auth            │    │
│  │  (Password-based)│      │  (OTP-based)           │    │
│  │                  │      │                        │    │
│  │  1. Signup       │      │  1. Register           │    │
│  │     └─ bcrypt    │      │  2. Request OTP        │    │
│  │        hash      │      │     └─ Generate 6-digit│    │
│  │  2. Signin       │      │     └─ Store in DB     │    │
│  │     └─ bcrypt    │      │     └─ Email via SMTP  │    │
│  │        compare   │      │  3. Verify OTP         │    │
│  │     └─ JWT sign  │      │     └─ Check expiry    │    │
│  │                  │      │     └─ JWT sign        │    │
│  └──────────────────┘      └────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  JWT Middleware (middleware/authMiddleware.js)     │  │
│  │                                                    │  │
│  │  Authorization: Bearer <token>                     │  │
│  │       │                                            │  │
│  │       ├── Extract token from header                │  │
│  │       ├── jwt.verify(token, JWT_SECRET)            │  │
│  │       ├── Attach decoded payload to req.user       │  │
│  │       └── next() or 401 Unauthorized               │  │
│  │                                                    │  │
│  │  Exports:                                          │  │
│  │    isAuthenticated ──── for patient routes         │  │
│  │    isAdminAuthenticated ── for admin routes        │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 3.2 Data Management Components

```
┌────────────────────────────────────────────────────────────────┐
│                   DATA MANAGEMENT                              │
│                                                                │
│  ┌──────────────────────┐      ┌───────────────────────────┐   │
│  │  Appointment Module  │      │  Doctor Module            │   │
│  │                      │      │                           │   │
│  │  POST   /api/form    │      │  POST   .../doctors       │   │
│  │  GET    /api/form    │      │  GET    .../doctors       │   │
│  │  GET    /api/form/:id│      │  GET    .../doctors/:id   │   │
│  │  PUT    /api/form/:id│      │  PUT    .../doctors/:id   │   │
│  │  DELETE /api/form/:id│      │  DELETE .../doctors/:id   │   │
│  │                      │      │                           │   │
│  │  Fields:             │      │  Fields:                  │   │
│  │   - patient info     │      │   - name, specialty       │   │
│  │   - doctor name      │──────│   - availability, degree  │   │
│  │   - description      │ ref  │   - contact info          │   │
│  │   - status (Pending/ │      │                           │   │
│  │     Accepted/Rejected│      │                           │   │
│  └──────────────────────┘      └───────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

---

## 4. Request Lifecycle — End-to-End Data Flow

Let's trace the **most important flow**: a patient booking an appointment.

```
Patient Browser                    Server                         MongoDB
     │                               │                               │
     │  POST /api/auth/signin        │                               │
     │  { email, password }          │                               │
     │ ─────────────────────────────>│                               │
     │                               │  Auth.findOne({ email })      │
     │                               │ ─────────────────────────────>│
     │                               │  { _id, email, password_hash }│
     │                               │ <─────────────────────────────│
     │                               │                               │
     │                               │  bcrypt.compare(pw, hash)     │
     │                               │  jwt.sign({ userId, email })  │
     │                               │                               │
     │  200 { token: "eyJhbG..." }   │                               │
     │ <─────────────────────────────│                               │
     │                               │                               │
     │  [Browser stores token        │                               │
     │   in localStorage]            │                               │
     │                               │                               │
     │  POST /api/form               │                               │
     │  Authorization: Bearer eyJ... │                               │
     │  { name, email, doctorname,   │                               │
     │    phonenumber, description,  │                               │
     │    dateOfBirth, address }     │                               │
     │ ─────────────────────────────>│                               │
     │                               │  [Middleware: verify JWT]     │
     │                               │  [Controller: validate]       │
     │                               │                               │
     │                               │  RegistrationForm.create()    │
     │                               │ ─────────────────────────────>│
     │                               │  { _id, status: "Pending" }   │
     │                               │ <─────────────────────────────│
     │                               │                               │
     │  201 { message, data }        │                               │
     │ <─────────────────────────────│                               │
     │                               │                               │
```

And the **admin approving** that appointment:

```
Admin Browser                      Server                         MongoDB
     │                               │                               │
     │  POST /api/adminauth/login    │                               │
     │  { email }                    │                               │
     │ ─────────────────────────────>│                               │
     │                               │  AdminAuth.findOne({ email }) │
     │                               │ ─────────────────────────────>│
     │                               │  Generate OTP: 482913         │
     │                               │  Save OTP + expiry to DB      │
     │                               │ ─────────────────────────────>│
     │                               │  sendOTP(email, 482913)       │
     │                               │ ──────────> Gmail SMTP        │
     │  200 { message: "OTP sent" }  │                               │
     │ <─────────────────────────────│                               │
     │                               │                               │
     │  POST /api/adminauth/verify-otp                               │
     │  { email, otp: "482913" }     │                               │
     │ ─────────────────────────────>│                               │
     │                               │  Validate OTP + expiry        │
     │                               │  jwt.sign({ email })          │
     │                               │  Clear OTP from DB            │
     │  200 { token: "eyJhbG..." }   │                               │
     │ <─────────────────────────────│                               │
     │                               │                               │
     │  PUT /api/form/:appointmentId │                               │
     │  Authorization: Bearer eyJ... │                               │
     │  { status: "Accepted" }       │                               │
     │ ─────────────────────────────>│                               │
     │                               │  findByIdAndUpdate(id,        │
     │                               │    { status: "Accepted" })    │
     │                               │ ─────────────────────────────>│
     │  200 { message, data }        │                               │
     │ <─────────────────────────────│                               │
```

---

## 5. Database Schema & Relationships (ERD)

```
┌──────────────────────┐
│       Auth           │         ┌───────────────────────────┐
│ (User Credentials)   │         │     RegistrationForm      │
├──────────────────────┤         │     (Appointments)        │
│ _id       ObjectId   │         ├───────────────────────────┤
│ name      String     │ 1───*   │ _id          ObjectId     │
│ email     String     │────────>│ name         String       │
│ password  String     │ (by     │ email        String       │
│           (hashed)   │  email) │ phonenumber  Number       │
└──────────────────────┘         │ dateOfBirth  Date         │
                                 │ address      String       │
┌──────────────────────┐         │ description  String       │
│     DoctorList       │ 1───*   │ doctorname   String ──────┤
│  (Doctor Profiles)   │────────>│ status       String       │
├──────────────────────┤ (by     │   ("Pending"|"Accepted"   │
│ _id        ObjectId  │  name)  │    |"Rejected")           │
│ name       String    │         │ createdAt    Date         │
│ specialty  String    │         │ updatedAt    Date         │
│ phonenumber Number   │         └───────────────────────────┘
│ dateOfBirth Date     │
│ address    String    │         ┌───────────────────────────┐
│ email      String    │         │       AdminAuth           │
│ availability String  │         │  (Admin Credentials)      │
│ degree     String    │         ├───────────────────────────┤
│ createdAt  Date      │         │ _id        ObjectId       │
│ updatedAt  Date      │         │ email      String (unique)│
└──────────────────────┘         │ name       String         │
                                 │ otp        String         │
                                 │ otpexpiry  Date           │
                                 │ createdAt  Date           │
                                 │ updatedAt  Date           │
                                 └───────────────────────────┘
```

---

## 6. API Endpoint Map

```
METHOD  PATH                                AUTH REQUIRED?    ACTOR
──────  ──────────────────────────────────  ────────────────  ─────
POST    /api/auth/signup                    No                Patient
POST    /api/auth/signin                    No                Patient

POST    /api/form                           Should be: Yes    Patient
GET     /api/form                           Should be: Yes    Admin
GET     /api/form/:id                       Should be: Yes    Both
PUT     /api/form/:id                       Should be: Yes    Admin
DELETE  /api/form/:id                       Should be: Yes    Admin

POST    /api/adminauth/signup               No                Admin
POST    /api/adminauth/login                No                Admin
POST    /api/adminauth/verify-otp           No                Admin

POST    /api/admin/doctorlist/doctors        Should be: Yes    Admin
GET     /api/admin/doctorlist/doctors        No (public list)  Anyone
GET     /api/admin/doctorlist/doctors/:id    No (public view)  Anyone
PUT     /api/admin/doctorlist/doctors/:id    Should be: Yes    Admin
DELETE  /api/admin/doctorlist/doctors/:id    Should be: Yes    Admin
```

---

## 7. Middleware Pipeline

Every request flows through this chain:

```
  Incoming Request
       │
       v
  ┌────────────────┐
  │  cors()        │  ← Allow cross-origin requests
  └───────┬────────┘
          v
  ┌────────────────┐
  │ express.json() │  ← Parse JSON body into req.body
  └───────┬────────┘
          v
  ┌────────────────────┐
  │ express.static()   │  ← If path matches a file in /frontend, serve it
  └───────┬────────────┘
          v
  ┌────────────────────┐
  │  Route Matching    │  ← Express matches URL to mounted router
  └───────┬────────────┘
          v
  ┌────────────────────┐
  │  Auth Middleware   │  ← isAuthenticated / isAdminAuthenticated
  │  (per-route)       │     Extracts & verifies JWT, attaches req.user
  └───────┬────────────┘
          v
  ┌────────────────────┐
  │  Controller        │  ← Business logic, DB calls, response
  └────────────────────┘
```

---

## 8. Project Structure 


```
Backend/
│
├── server.js                    # App bootstrap — keep this thin
│
├── config/
│   ├── db.js                    # MongoDB connection (extract from server.js)
│   └── email.js                 # Nodemailer transporter + sendOTP
│
├── middleware/
│   ├── authMiddleware.js        # JWT verification guards
│   ├── errorHandler.js          # Global error handling middleware
│   ├── rateLimiter.js           # Rate limiting for auth endpoints
│   └── validate.js              # Request validation middleware
│
├── Models/
│   ├── authmodels.js            # User credentials schema
│   ├── adminAuthModels.js       # Admin + OTP schema
│   ├── doctorlistModel.js       # Doctor profile schema
│   └── registrationformModel.js # Appointment schema
│
├── Controllers/
│   ├── authcontroller.js        # User signup/signin logic
│   ├── adminAuthController.js   # Admin OTP flow logic
│   ├── doctorListController.js  # Doctor CRUD logic
│   └── registrationformcontroller.js  # Appointment CRUD logic
│
├── Routes/
│   ├── authroutes.js            # /api/auth/*
│   ├── adminAuthRoutes.js       # /api/adminauth/*
│   ├── doctorlistRoutes.js      # /api/admin/doctorlist/*
│   └── registrationformRoute.js # /api/form/*
│
├── utils/                       # Shared utilities
│   └── ApiError.js              # Custom error class
│
├── frontend/                    # Static HTML/CSS/JS
├── .env                         # Environment variables (never commit!)
├── .gitignore
└── package.json
```

**Key principle:** Each folder has ONE job. If a file doesn't fit cleanly into a folder, the structure needs rethinking, not the file.


**Mental model:** A request enters at `server.js`, gets routed by URL pattern, optionally passes through middleware, hits a controller function, which talks to a model, which talks to MongoDB.

---

*This document is a living artifact. Update it as the architecture evolves.*
