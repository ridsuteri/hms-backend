# Queue-Backed Appointment Lifecycle Plan

## Why this document exists

This repository already teaches core backend ideas well:

- Express routing
- JWT-based auth
- MongoDB with Mongoose
- Admin OTP login
- Doctor CRUD
- Appointment CRUD
- Basic Redis caching

The next high-value step is to evolve the appointment flow from a plain CRUD flow into a small workflow system powered by a queue.

That change teaches a beginner/intermediate backend developer how real production systems handle:

- background jobs
- retries
- delayed work
- side effects
- failure isolation
- observability
- workflow thinking instead of only request/response thinking

---

## Current backend flow

### Current appointment creation

Today, the main flow is:

1. User sends `POST /api/form`
2. Server validates input in `controllers/registrationformcontroller.js`
3. Server checks whether doctor exists
4. Server creates appointment in MongoDB
5. Server immediately returns response

### Current admin update flow

Today, appointment status updates work like this:

1. Admin sends `PUT /api/form/:id`
2. Server updates `status` directly in MongoDB
3. Server returns response

### Current limitation

The backend currently stores state, but it does not manage side effects as a proper workflow.

Examples of missing workflow behavior:

- notify patient when appointment is accepted
- notify patient when appointment is rejected
- schedule reminders for accepted appointments
- retry email sending if email provider fails
- track failed background operations
- inspect what happened after a status change

Right now, if you add email sending directly inside controllers, the API route becomes slower, more fragile, and harder to debug.

---

## What a queue adds

A queue separates:

- the API request that accepts work
- the background worker that completes side effects

This is a major backend design improvement.

### Without queue

Controller does everything:

- validate request
- update database
- send email
- maybe schedule reminder
- maybe log audit event

Problems:

- slow responses
- failures in email provider can break API flow
- retries become messy
- delayed work is awkward
- controller logic becomes bloated

### With queue

Controller only does core work:

- validate request
- write the main database state
- push a job to Redis queue
- return success quickly

Worker handles side effects:

- send confirmation email
- send status update email
- schedule reminder job
- retry on temporary failure
- log failures for later inspection

This is much closer to how real systems are built.

---

## Best-fit scope for this repository

The most natural first queue feature here is:

## Queue-backed appointment lifecycle

This means:

- when an appointment is created, enqueue a follow-up job
- when an admin changes appointment status, enqueue notification jobs
- when appointment becomes accepted, schedule reminder jobs
- workers process those jobs in the background

This stays inside the current domain of the project, so the new concept feels useful instead of artificial.

---

## Recommended stack

Because this repo already uses Redis, the cleanest choice is:

- `bullmq` for queues and workers
- existing Redis for queue storage

Optional later additions:

- `@bull-board/express` for job dashboard
- `ioredis` if you want a BullMQ-specific Redis client layer

---

## High-level architecture after queue

```text
Browser
   |
   v
Express API
   |
   | writes source-of-truth data
   v
MongoDB
   |
   | enqueue side effects
   v
Redis Queue
   |
   v
Worker Process
   |
   +--> SendGrid email
   +--> reminder scheduling
   +--> audit logging
```

### Important idea

MongoDB remains the source of truth for appointments.

Redis queue is not the source of truth.
It only stores pending background work.

---

## Workflow after queue

## Flow 1: User creates appointment

1. User calls `POST /api/form`
2. API validates request
3. API verifies doctor exists
4. API creates appointment in MongoDB with status `Pending`
5. API enqueues `appointment.created`
6. API returns success immediately
7. Worker consumes `appointment.created`
8. Worker may send:
   - patient confirmation email
   - admin notification email
   - audit log entry

### Why this is better

Even if email delivery is slow, the appointment still gets created quickly.

---

## Flow 2: Admin accepts appointment

1. Admin calls `PUT /api/form/:id` with `status = Accepted`
2. API validates status transition
3. API updates MongoDB
4. API enqueues `appointment.status.changed`
5. API returns success immediately
6. Worker sends acceptance email
7. Worker schedules a delayed reminder job if appointment date/time exists

### Why this is better

The status update is not blocked by external email delivery.

---

## Flow 3: Reminder before appointment

1. Worker receives delayed `appointment.reminder.send`
2. Worker fetches appointment from MongoDB
3. Worker verifies appointment is still `Accepted`
4. Worker sends reminder email
5. Worker marks reminder as sent in logs or metadata

### Why this matters

This introduces delayed jobs and idempotent background processing, which are extremely valuable backend concepts.

---

## Learning outcomes from this change

By implementing this feature, a learner practices:

- event-driven thinking
- background processing
- Redis beyond caching
- retries and backoff
- designing job payloads
- delayed jobs
- idempotency
- separating source-of-truth writes from side effects
- monitoring and debugging async systems

This is a much bigger career-value jump than adding one more CRUD entity.

---

## Recommended implementation phases

Do this in phases so complexity stays manageable.

## Phase 0: Stabilize the current backend

Before adding queues, clean up a few correctness issues.

### Fix first

- `models/registrationformModel.js`
  - add enum for appointment status
- `controllers/registrationformcontroller.js`
  - validate status updates instead of accepting any string
- `controllers/doctorListController.js`
  - finish cache invalidation if you want Redis consistency

These fixes make the workflow feature much safer to build on.

---

## Phase 1: Add queue infrastructure

### Goal

Introduce queue utilities without changing product behavior too much.

### New files to add

```text
config/queue.js
queues/appointmentQueue.js
workers/appointmentWorker.js
services/appointmentEventService.js
services/notificationService.js
```

### What each file does

- `config/queue.js`
  - creates shared Redis connection for BullMQ
- `queues/appointmentQueue.js`
  - exports queue helpers like `enqueueAppointmentCreated`
- `workers/appointmentWorker.js`
  - processes background jobs
- `services/appointmentEventService.js`
  - optionally logs domain events
- `services/notificationService.js`
  - wraps SendGrid email logic for appointment notifications

---

## Phase 2: Queue appointment creation side effects

### Goal

After appointment creation, push a job instead of doing side effects inline.

### First job type

- `appointment.created`

### Worker behavior

- send confirmation email to patient
- send admin notification email
- log success or failure

This phase gives immediate learning value with relatively low risk.

---

## Phase 3: Queue appointment status updates

### Goal

Convert appointment status changes into workflow events.

### Job type

- `appointment.status.changed`

### Worker behavior

- send patient status update email
- if accepted, schedule delayed reminder job
- if rejected, stop future reminders

This phase teaches workflow branching.

---

## Phase 4: Add delayed reminder jobs

### Job type

- `appointment.reminder.send`

### Worker behavior

- verify appointment still exists
- verify status is still `Accepted`
- verify reminder not already sent
- send reminder

This phase teaches delayed jobs and idempotency.

---

## Phase 5: Add observability

### Good additions

- job attempts and backoff
- structured logs
- failed job inspection
- optional Bull Board dashboard
- optional `NotificationLog` collection

This phase teaches how production systems are operated, not just coded.

---

## Suggested domain events

You do not need many event types at first.

Start with these:

- `appointment.created`
- `appointment.status.changed`
- `appointment.reminder.send`

Optional later:

- `admin.otp.requested`
- `doctor.created`
- `doctor.updated`

For this repo, appointment events are the best starting point.

---

## Suggested job payloads

Keep job payloads small and stable.

Good payload:

```js
{
  appointmentId: "mongo_object_id",
  triggeredBy: {
    role: "user" // or "admin"
    id: "user_or_admin_id"
  },
  eventType: "appointment.created",
  timestamp: "2026-05-10T10:00:00.000Z"
}
```

Avoid putting the entire appointment object into the queue payload.

Why:

- smaller jobs
- fresher DB reads in workers
- fewer stale data bugs

---

## Data model improvements to support workflow

Before building reminders, the appointment schema should grow slightly.

### Current status field

Current model:

- `status: String`

### Better version

```js
status: {
  type: String,
  enum: ["Pending", "Accepted", "Rejected", "Completed", "Cancelled"],
  default: "Pending",
  required: true
}
```

### Helpful additions

- `appointmentDate`
- `appointmentTime`
- `statusUpdatedAt`
- `statusHistory`
- `lastReminderSentAt`

Example:

```js
statusHistory: [
  {
    status: String,
    changedByRole: String,
    changedById: mongoose.Schema.Types.ObjectId,
    changedAt: Date
  }
]
```

This is very educational because it introduces audit trail design.

---

## Pseudocode: queue setup

## `config/queue.js`

```js
const { RedisOptions } = require("bullmq");

const connection = {
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASS,
  username: "default"
};

module.exports = { connection };
```

## `queues/appointmentQueue.js`

```js
const { Queue } = require("bullmq");
const { connection } = require("../config/queue");

const appointmentQueue = new Queue("appointment-lifecycle", { connection });

async function enqueueAppointmentCreated({ appointmentId, triggeredBy }) {
  await appointmentQueue.add(
    "appointment.created",
    {
      appointmentId,
      triggeredBy,
      eventType: "appointment.created",
      timestamp: new Date().toISOString()
    },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000
      },
      removeOnComplete: 100,
      removeOnFail: 100
    }
  );
}

async function enqueueAppointmentStatusChanged({
  appointmentId,
  previousStatus,
  nextStatus,
  triggeredBy
}) {
  await appointmentQueue.add(
    "appointment.status.changed",
    {
      appointmentId,
      previousStatus,
      nextStatus,
      triggeredBy,
      eventType: "appointment.status.changed",
      timestamp: new Date().toISOString()
    },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000
      },
      removeOnComplete: 100,
      removeOnFail: 100
    }
  );
}

async function enqueueAppointmentReminder({
  appointmentId,
  delay
}) {
  await appointmentQueue.add(
    "appointment.reminder.send",
    {
      appointmentId,
      eventType: "appointment.reminder.send",
      timestamp: new Date().toISOString()
    },
    {
      delay,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 10000
      },
      removeOnComplete: 100,
      removeOnFail: 100
    }
  );
}

module.exports = {
  appointmentQueue,
  enqueueAppointmentCreated,
  enqueueAppointmentStatusChanged,
  enqueueAppointmentReminder
};
```

---

## Pseudocode: controller integration

## Partial change for `createAppointment`

```js
const {
  enqueueAppointmentCreated
} = require("../queues/appointmentQueue");

const createAppointment = async (req, res) => {
  try {
    // validate input
    // verify doctor exists

    const newAppointment = new RegistrationForm({
      ...payload,
      doctorId: doctor._id,
      doctorName: doctor.name,
      userId: req.user.userId,
      status: "Pending",
      statusHistory: [
        {
          status: "Pending",
          changedByRole: "user",
          changedById: req.user.userId,
          changedAt: new Date()
        }
      ]
    });

    await newAppointment.save();

    await enqueueAppointmentCreated({
      appointmentId: newAppointment._id.toString(),
      triggeredBy: {
        role: "user",
        id: req.user.userId
      }
    });

    res.status(201).json({
      message: "Appointment created successfully",
      data: newAppointment
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
```

### Important note

Later, if you want stronger consistency, you can use the outbox pattern.
For this repo, direct enqueue-after-save is a good learning-friendly first step.

---

## Partial change for `updateAppointment`

```js
const {
  enqueueAppointmentStatusChanged
} = require("../queues/appointmentQueue");

const ALLOWED_STATUSES = [
  "Pending",
  "Accepted",
  "Rejected",
  "Completed",
  "Cancelled"
];

const updateAppointment = async (req, res) => {
  try {
    const nextStatus = String(req.body.status || "").trim();

    if (!ALLOWED_STATUSES.includes(nextStatus)) {
      return res.status(400).json({ error: "Invalid appointment status" });
    }

    const appointment = await RegistrationForm.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    const previousStatus = appointment.status;
    appointment.status = nextStatus;
    appointment.statusUpdatedAt = new Date();
    appointment.statusHistory.push({
      status: nextStatus,
      changedByRole: "admin",
      changedById: req.user.adminId,
      changedAt: new Date()
    });

    await appointment.save();

    await enqueueAppointmentStatusChanged({
      appointmentId: appointment._id.toString(),
      previousStatus,
      nextStatus,
      triggeredBy: {
        role: "admin",
        id: req.user.adminId
      }
    });

    res.status(200).json({
      message: "Appointment status updated successfully",
      data: appointment
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
```

---

## Pseudocode: worker logic

## `workers/appointmentWorker.js`

```js
const { Worker } = require("bullmq");
const { connection } = require("../config/queue");
const RegistrationForm = require("../models/registrationformModel");
const {
  enqueueAppointmentReminder
} = require("../queues/appointmentQueue");
const {
  sendAppointmentCreatedEmail,
  sendAppointmentStatusChangedEmail,
  sendAppointmentReminderEmail
} = require("../services/notificationService");

const worker = new Worker(
  "appointment-lifecycle",
  async (job) => {
    switch (job.name) {
      case "appointment.created": {
        const appointment = await RegistrationForm.findById(job.data.appointmentId);
        if (!appointment) return;

        await sendAppointmentCreatedEmail(appointment);
        return;
      }

      case "appointment.status.changed": {
        const appointment = await RegistrationForm.findById(job.data.appointmentId);
        if (!appointment) return;

        await sendAppointmentStatusChangedEmail(appointment, {
          previousStatus: job.data.previousStatus,
          nextStatus: job.data.nextStatus
        });

        if (job.data.nextStatus === "Accepted" && appointment.appointmentDate) {
          const reminderDelay = calculateReminderDelay(appointment.appointmentDate);

          if (reminderDelay > 0) {
            await enqueueAppointmentReminder({
              appointmentId: appointment._id.toString(),
              delay: reminderDelay
            });
          }
        }

        return;
      }

      case "appointment.reminder.send": {
        const appointment = await RegistrationForm.findById(job.data.appointmentId);
        if (!appointment) return;
        if (appointment.status !== "Accepted") return;
        if (appointment.lastReminderSentAt) return;

        await sendAppointmentReminderEmail(appointment);
        appointment.lastReminderSentAt = new Date();
        await appointment.save();
        return;
      }

      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  },
  { connection }
);

worker.on("completed", (job) => {
  console.log(`Job completed: ${job.id} ${job.name}`);
});

worker.on("failed", (job, err) => {
  console.error(`Job failed: ${job?.id} ${job?.name}`, err);
});
```

---

## Pseudocode: notification service

## `services/notificationService.js`

```js
const { canSendEmail, sendOTP } = require("../config/email");

async function sendAppointmentCreatedEmail(appointment) {
  if (!canSendEmail()) {
    console.log("Skipping appointment created email in local mode");
    return;
  }

  // Replace this with a general sendEmail helper later.
  // The current config/email.js is OTP-focused, so it should be generalized.
}

async function sendAppointmentStatusChangedEmail(appointment, context) {
  if (!canSendEmail()) {
    console.log("Skipping status email in local mode", context);
    return;
  }
}

async function sendAppointmentReminderEmail(appointment) {
  if (!canSendEmail()) {
    console.log("Skipping reminder email in local mode");
    return;
  }
}

module.exports = {
  sendAppointmentCreatedEmail,
  sendAppointmentStatusChangedEmail,
  sendAppointmentReminderEmail
};
```

---

## Recommended partial implementation order

If you want to build this incrementally, this is the best order.

1. Fix auth middleware bug and appointment status validation
2. Add appointment status enum to schema
3. Install BullMQ
4. Add queue config and appointment queue helper
5. Add worker process
6. Enqueue `appointment.created`
7. Process `appointment.created` in worker
8. Enqueue `appointment.status.changed`
9. Process status-change notifications
10. Add delayed reminder jobs
11. Add dashboard/logging

This order keeps the codebase stable while introducing one concept at a time.

---

## Partial implementation checklist for this repo

### Files likely to change

- `package.json`
- `server.js`
- `config/email.js`
- `models/registrationformModel.js`
- `controllers/registrationformcontroller.js`
- `middleware/authMiddleware.js`

### Files likely to add

- `config/queue.js`
- `queues/appointmentQueue.js`
- `workers/appointmentWorker.js`
- `services/notificationService.js`
- `models/notificationLogModel.js` optional

---

## Example npm scripts

Later, your `package.json` can look something like this:

```json
{
  "scripts": {
    "start": "nodemon server.js",
    "worker": "nodemon workers/appointmentWorker.js",
    "dev": "concurrently \"nodemon server.js\" \"nodemon workers/appointmentWorker.js\""
  }
}
```

If you do not want to introduce `concurrently` yet, running API and worker in separate terminals is perfectly fine.

---

## Tradeoffs and caveats

Queues add real value, but they also add complexity.

### New complexity you must understand

- job can run later, not immediately
- job can fail after API already returned success
- worker must be running
- retries can create duplicates if code is not idempotent

This is exactly why the feature is valuable as a learning step.

It teaches real backend engineering tradeoffs.

---

## Best teaching message for this repo

The repository starts as a CRUD application.
After this change, it starts behaving like a small workflow system.

That shift is the real leap:

- from storing data
- to orchestrating reliable backend behavior

---

## Suggested next step from here

If implementing this now, the best first coding milestone is:

## Milestone 1

Add BullMQ and wire only one background event:

- `appointment.created`

That keeps the change small, visible, and easy to test.

After that, extend the same pattern to:

- `appointment.status.changed`
- `appointment.reminder.send`

---

## If you want a deeper production-grade version later

After the first working version, the next advanced ideas would be:

- outbox pattern for stronger DB + queue consistency
- notification log collection for idempotency
- Bull Board for queue inspection
- rate limiting OTP requests
- queue-based OTP sending too
- appointment slot scheduling instead of only status changes

Those are excellent follow-ups, but not necessary for the first learning milestone.
