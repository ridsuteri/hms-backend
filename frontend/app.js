const App = {
    async request(path, options = {}) {
        const {
            auth,
            json,
            body,
            headers = {},
            method = "GET"
        } = options;

        const config = { method, headers: { ...headers } };
        const session = auth === "admin"
            ? this.getAdminSession()
            : auth === "user"
                ? this.getUserSession()
                : null;

        if (session?.token) {
            config.headers.Authorization = `Bearer ${session.token}`;
        }

        if (json !== undefined) {
            config.headers["Content-Type"] = "application/json";
            config.body = JSON.stringify(json);
        } else if (body !== undefined) {
            if (!config.headers["Content-Type"]) {
                config.headers["Content-Type"] = "application/json";
            }
            config.body = body;
        }

        const response = await fetch(path, config);
        const text = await response.text();
        let data = {};

        if (text) {
            try {
                data = JSON.parse(text);
            } catch (error) {
                data = { message: text };
            }
        }

        if (!response.ok) {
            const message = data.error || data.message || "Request failed";
            throw new Error(message);
        }

        return data;
    },

    api: {
        signupUser(payload) {
            return App.request("/api/auth/signup", { method: "POST", json: payload });
        },

        signinUser(payload) {
            return App.request("/api/auth/login", { method: "POST", json: payload });
        },

        currentUser() {
            return App.request("/api/auth/me", { auth: "user" });
        },

        listDoctors() {
            return App.request("/api/admin/doctorlist/doctors");
        },

        createAppointment(payload) {
            return App.request("/api/form", { method: "POST", json: payload, auth: "user" });
        },

        myAppointments() {
            return App.request("/api/form/mine", { auth: "user" });
        },

        adminSignup(payload) {
            return App.request("/api/adminauth/signup", { method: "POST", json: payload });
        },

        adminRequestOtp(payload) {
            return App.request("/api/adminauth/login", { method: "POST", json: payload });
        },

        adminVerifyOtp(payload) {
            return App.request("/api/adminauth/verify-otp", { method: "POST", json: payload });
        },

        listAllAppointments() {
            return App.request("/api/form", { auth: "admin" });
        },

        createDoctor(payload) {
            return App.request("/api/admin/doctorlist/doctors", { method: "POST", json: payload, auth: "admin" });
        },

        deleteDoctor(id) {
            return App.request(`/api/admin/doctorlist/doctors/${id}`, { method: "DELETE", auth: "admin" });
        },

        updateAppointmentStatus(id, status) {
            return App.request(`/api/form/${id}`, { method: "PUT", json: { status }, auth: "admin" });
        }
    },

    setMessage(element, message, type = "info") {
        if (!element) {
            return;
        }

        if (!message) {
            element.hidden = true;
            element.textContent = "";
            element.className = "message";
            return;
        }

        element.hidden = false;
        element.textContent = message;
        element.className = `message ${type}`;
    },

    escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, (char) => {
            const map = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                "\"": "&quot;",
                "'": "&#39;"
            };

            return map[char];
        });
    },

    decodeToken(token) {
        if (!token) {
            return null;
        }

        try {
            const part = token.split(".")[1];
            const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
            const payload = decodeURIComponent(
                atob(base64)
                    .split("")
                    .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
                    .join("")
            );

            return JSON.parse(payload);
        } catch (error) {
            return null;
        }
    },

    formatDate(value) {
        if (!value) {
            return "-";
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return "-";
        }

        return date.toLocaleDateString();
    },

    formatDateTime(value) {
        if (!value) {
            return "-";
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return "-";
        }

        return date.toLocaleString();
    },

    saveUserSession(token) {
        this.clearAdminSession();
        localStorage.setItem("token", token);
    },

    clearUserSession() {
        localStorage.removeItem("token");
    },

    getUserSession() {
        return this.getValidSession("user");
    },

    saveAdminSession(token) {
        this.clearUserSession();
        sessionStorage.setItem("adminToken", token);
    },

    clearAdminSession() {
        sessionStorage.removeItem("adminToken");
    },

    getAdminSession() {
        return this.getValidSession("admin");
    },

    isTokenExpired(payload) {
        return Boolean(payload?.exp && Date.now() >= payload.exp * 1000);
    },

    getValidSession(type) {
        const storage = type === "admin" ? sessionStorage : localStorage;
        const key = type === "admin" ? "adminToken" : "token";
        const token = storage.getItem(key);
        const payload = this.decodeToken(token);

        if (!token) {
            return { token: null, payload: null };
        }

        if (!payload || this.isTokenExpired(payload)) {
            storage.removeItem(key);
            return { token: null, payload: null };
        }

        return { token, payload };
    },

    getSessionState() {
        const adminSession = this.getValidSession("admin");
        const userSession = this.getValidSession("user");
        const role = adminSession.token ? "admin" : userSession.token ? "user" : "guest";

        return { role, adminSession, userSession };
    },

    getDefaultRouteForRole(role) {
        if (role === "admin") {
            return "/admin-dashboard/admindashboard.html";
        }

        if (role === "user") {
            return "/dashboard.html";
        }

        return "/";
    },

    redirect(path) {
        window.location.href = path;
    },

    applyRouteGuards(page) {
        const { role } = this.getSessionState();
        const patientAuthPages = new Set(["signin", "signup"]);
        const adminAuthPages = new Set(["adminLogin", "adminRegister"]);
        const patientProtectedPages = new Set(["doctorlist", "booking", "dashboard", "profile"]);
        const adminProtectedPages = new Set(["adminDashboard", "adminAddDoctor", "adminBookings"]);

        if (patientAuthPages.has(page) || adminAuthPages.has(page)) {
            if (role !== "guest") {
                this.redirect(this.getDefaultRouteForRole(role));
                return true;
            }

            return false;
        }

        if (patientProtectedPages.has(page)) {
            if (role === "user") {
                return false;
            }

            this.redirect(role === "admin" ? "/admin-dashboard/admindashboard.html" : "/signin.html");
            return true;
        }

        if (adminProtectedPages.has(page)) {
            if (role === "admin") {
                return false;
            }

            this.redirect(role === "user" ? "/dashboard.html" : "/admin-dashboard");
            return true;
        }

        return false;
    },

    setVisibility(element, isVisible) {
        if (!element) {
            return;
        }

        element.hidden = !isVisible;
        element.style.display = isVisible ? "" : "none";
    },

    getCurrentPath() {
        return window.location.pathname;
    },

    getGuestNavigation(page) {
        return [
            { label: "Home", href: "/", active: page === "home" },
            { label: "Patient sign in", href: "/signin.html", active: page === "signin" },
            { label: "Create account", href: "/signup.html", active: page === "signup" },
            {
                label: "Admin access",
                href: "/admin-dashboard",
                active: page === "adminLogin" || page === "adminRegister"
            }
        ];
    },

    getUserNavigation(page) {
        return [
            { label: "Home", href: "/", active: page === "home" },
            { label: "Doctors", href: "/doctorlist.html", active: page === "doctorlist" },
            { label: "Book", href: "/bookingappointment.html", active: page === "booking" },
            { label: "Dashboard", href: "/dashboard.html", active: page === "dashboard" },
            { label: "Account", href: "/profile.html", active: page === "profile" }
        ];
    },

    getAdminNavigation(page) {
        return [
            { label: "Dashboard", href: "/admin-dashboard/admindashboard.html", active: page === "adminDashboard" },
            { label: "Bookings", href: "/admin-dashboard/allBookingpage.html", active: page === "adminBookings" },
            { label: "Add doctor", href: "/admin-dashboard/adminadddoctorform.html", active: page === "adminAddDoctor" }
        ];
    },

    getNavigationForPage(page, role) {
        if (role === "admin") {
            return this.getAdminNavigation(page);
        }

        if (role === "user") {
            return this.getUserNavigation(page);
        }

        return this.getGuestNavigation(page);
    },

    configureNavigation(page) {
        const nav = document.querySelector(".nav");
        const brand = document.querySelector(".brand");

        if (!nav || !brand) {
            return;
        }

        const { role } = this.getSessionState();
        const navItems = this.getNavigationForPage(page, role);

        brand.textContent = "Healthcare HMS";
        brand.setAttribute("href", role === "admin" ? "/admin-dashboard/admindashboard.html" : "/");

        nav.innerHTML = navItems.map((item) => `
            <a href="${item.href}"${item.active ? ' class="active"' : ""}>${item.label}</a>
        `).join("");

        if (role !== "guest" && !document.getElementById("logoutButton") && !document.getElementById("signoutButton")) {
            const actionLink = document.createElement("a");
            actionLink.href = "#";
            actionLink.dataset.navSessionAction = "signout";
            actionLink.textContent = "Sign out";
            actionLink.addEventListener("click", (event) => {
                event.preventDefault();
                this.clearUserSession();
                this.clearAdminSession();
                this.redirect(role === "admin" ? "/admin-dashboard" : "/signin.html");
            });
            nav.appendChild(actionLink);
        }
    },

    requireSession(type, redirectPath) {
        const session = this.getValidSession(type);

        if (!session.token) {
            window.location.href = redirectPath;
            return null;
        }

        return session;
    },

    bindSignOut(buttonId, type, redirectPath) {
        const button = document.getElementById(buttonId);

        if (!button) {
            return;
        }

        button.addEventListener("click", () => {
            if (type === "admin") {
                this.clearAdminSession();
            } else {
                this.clearUserSession();
            }

            window.location.href = redirectPath;
        });
    },

    renderInfoRows(element, rows) {
        if (!element) {
            return;
        }

        element.innerHTML = rows.map((row) => `
            <div class="info-row">
                <span>${this.escapeHtml(row.label)}</span>
                <strong>${row.html ? row.value : this.escapeHtml(row.value)}</strong>
            </div>
        `).join("");
    },

    getStatusClass(status) {
        const normalized = String(status || "").toLowerCase();

        if (normalized === "accepted") {
            return "accepted";
        }

        if (normalized === "rejected") {
            return "rejected";
        }

        if (normalized === "completed") {
            return "completed";
        }

        return "pending";
    },

    async loadDoctorOptions(selectElement, selectedDoctor = "") {
        const data = await this.api.listDoctors();
        const doctors = data.data || [];

        if (!doctors.length) {
            selectElement.innerHTML = '<option value="">No doctors available</option>';
            return doctors;
        }

        selectElement.innerHTML = [
            '<option value="">Select a doctor</option>',
            ...doctors.map((doctor) => {
                const doctorId = doctor._id || doctor.id;
                const selected = selectedDoctor === doctor.name ? "selected" : "";
                return `<option value="${this.escapeHtml(doctorId)}" ${selected}>${this.escapeHtml(doctor.name)}${doctor.specialty ? ` - ${this.escapeHtml(doctor.specialty)}` : ""}</option>`;
            })
        ].join("");

        return doctors;
    },

    pages: {
        signup() {
            const form = document.getElementById("signupForm");
            const message = document.getElementById("message");

            form.addEventListener("submit", async (event) => {
                event.preventDefault();
                App.setMessage(message, "");

                const password = document.getElementById("signupPassword").value;
                const confirmPassword = document.getElementById("signupConfirmPassword").value;

                if (password !== confirmPassword) {
                    App.setMessage(message, "Passwords do not match.", "error");
                    return;
                }

                try {
                    const data = await App.api.signupUser({
                        name: document.getElementById("signupName").value.trim(),
                        email: document.getElementById("signupEmail").value.trim(),
                        password
                    });

                    App.setMessage(message, data.message || "Account created successfully.", "success");
                    form.reset();
                    setTimeout(() => {
                        window.location.href = "/signin.html";
                    }, 1000);
                } catch (error) {
                    App.setMessage(message, error.message, "error");
                }
            });
        },

        signin() {
            const form = document.getElementById("signinForm");
            const message = document.getElementById("message");

            form.addEventListener("submit", async (event) => {
                event.preventDefault();
                App.setMessage(message, "");

                try {
                    const data = await App.api.signinUser({
                        email: document.getElementById("signinEmail").value.trim(),
                        password: document.getElementById("signinPassword").value
                    });

                    App.saveUserSession(data.token);
                    window.location.href = "/dashboard.html";
                } catch (error) {
                    App.setMessage(message, error.message, "error");
                }
            });
        },

        dashboard() {
            const message = document.getElementById("message");
            const sessionInfo = document.getElementById("sessionInfo");
            const doctorCount = document.getElementById("doctorCount");
            const appointmentCount = document.getElementById("appointmentCount");
            const authState = document.getElementById("authState");
            App.bindSignOut("logoutButton", "user", "/signin.html");

            const session = App.getUserSession();

            Promise.all([
                App.api.listDoctors(),
                session.token ? App.api.currentUser() : Promise.resolve(null),
                session.token ? App.api.myAppointments() : Promise.resolve({ data: [] })
            ]).then(([doctorData, userData, appointmentData]) => {
                const doctors = doctorData.data || [];
                const appointments = appointmentData?.data || [];

                doctorCount.textContent = String(doctors.length);
                appointmentCount.textContent = String(appointments.length);

                if (session.token && userData?.data?.user) {
                    const user = userData.data.user;
                    const payload = session.payload || {};
                    const expiry = payload.exp ? new Date(payload.exp * 1000).toLocaleString() : "Unknown";

                    App.renderInfoRows(sessionInfo, [
                        { label: "Name", value: user.name || "Unavailable" },
                        { label: "Email", value: user.email || "Unavailable" },
                        { label: "Token expiry", value: expiry }
                    ]);
                    authState.textContent = "Signed in";
                }
            }).catch((error) => {
                App.setMessage(message, error.message, "error");
            });
        },

        doctorlist() {
            const doctorList = document.getElementById("doctorList");
            const doctorCount = document.getElementById("doctorCount");
            const message = document.getElementById("message");

            App.api.listDoctors().then((data) => {
                const doctors = data.data || [];
                doctorCount.textContent = `${doctors.length} doctor${doctors.length === 1 ? "" : "s"} available`;
                App.setMessage(
                    message,
                    data.meta?.source === "cache"
                        ? "Doctor list loaded from Redis cache."
                        : "Doctor list loaded from MongoDB.",
                    "info"
                );

                if (!doctors.length) {
                    doctorList.innerHTML = '<div class="empty-state">No doctors have been added yet.</div>';
                    return;
                }

                doctorList.innerHTML = doctors.map((doctor) => `
                    <article class="list-card">
                        <div class="list-card-header">
                            <div>
                                <h3>${App.escapeHtml(doctor.name)}</h3>
                                <p class="helper">${App.escapeHtml(doctor.specialty)}${doctor.degree ? ` · ${App.escapeHtml(doctor.degree)}` : ""}</p>
                            </div>
                            <a class="button-small complete" href="/bookingappointment.html?doctor=${encodeURIComponent(doctor.name)}">Choose doctor</a>
                        </div>
                        <p><strong>Availability:</strong> ${App.escapeHtml(doctor.availability || "-")}</p>
                        <p><strong>Phone:</strong> ${App.escapeHtml(doctor.phonenumber || "-")}</p>
                        <p><strong>Email:</strong> ${App.escapeHtml(doctor.email || "-")}</p>
                        <p><strong>Address:</strong> ${App.escapeHtml(doctor.address || "-")}</p>
                    </article>
                `).join("");
            }).catch((error) => {
                doctorCount.textContent = "Doctors";
                doctorList.innerHTML = "";
                App.setMessage(message, error.message, "error");
            });
        },

        async booking() {
            const form = document.getElementById("appointmentForm");
            const message = document.getElementById("message");
            const doctorSelect = document.getElementById("doctorSelect");
            const selectedDoctor = new URLSearchParams(window.location.search).get("doctor") || "";
            const session = App.getUserSession();

            try {
                await App.loadDoctorOptions(doctorSelect, selectedDoctor);
            } catch (error) {
                doctorSelect.innerHTML = '<option value="">Unable to load doctors</option>';
                App.setMessage(message, error.message, "error");
            }

            if (session.token) {
                try {
                    const userData = await App.api.currentUser();
                    const user = userData.data.user;
                    document.getElementById("name").value = user.name || "";
                    document.getElementById("email").value = user.email || "";
                } catch (error) {
                    App.setMessage(message, error.message, "error");
                }
            }

            form.addEventListener("submit", async (event) => {
                event.preventDefault();
                App.setMessage(message, "");

                try {
                    const data = await App.api.createAppointment({
                        name: document.getElementById("name").value.trim(),
                        email: document.getElementById("email").value.trim(),
                        phonenumber: document.getElementById("phone").value.trim(),
                        dateOfBirth: document.getElementById("dob").value,
                        address: document.getElementById("address").value.trim(),
                        doctorId: doctorSelect.value,
                        description: document.getElementById("visitReason").value.trim()
                    });

                    App.setMessage(message, data.message || "Appointment created successfully.", "success");
                    form.reset();
                    if (session.token) {
                        try {
                            const userData = await App.api.currentUser();
                            const user = userData.data.user;
                            document.getElementById("name").value = user.name || "";
                            document.getElementById("email").value = user.email || "";
                        } catch (error) {
                            App.setMessage(message, error.message, "error");
                        }
                    }
                    await App.loadDoctorOptions(doctorSelect, "");
                } catch (error) {
                    App.setMessage(message, error.message, "error");
                }
            });
        },

        async profile() {
            const accountInfo = document.getElementById("accountInfo");
            const appointmentSummary = document.getElementById("appointmentSummary");
            const message = document.getElementById("message");
            App.bindSignOut("signoutButton", "user", "/signin.html");

            const session = App.getUserSession();

            try {
                const [userData, appointmentData] = await Promise.all([
                    App.api.currentUser(),
                    App.api.myAppointments()
                ]);
                const user = userData.data.user;
                const appointments = appointmentData.data || [];
                const payload = session.payload || {};
                const expiry = payload.exp ? new Date(payload.exp * 1000).toLocaleString() : "Unknown";

                App.renderInfoRows(accountInfo, [
                    { label: "Name", value: user.name || "Unavailable" },
                    { label: "Email", value: user.email || "Unavailable" },
                    { label: "Appointments", value: String(appointments.length) },
                    { label: "Token expiry", value: expiry }
                ]);

                if (!appointments.length) {
                    appointmentSummary.innerHTML = '<div class="empty-state">No appointments submitted yet.</div>';
                    return;
                }

                appointmentSummary.innerHTML = appointments.slice(0, 3).map((appointment) => `
                    <article class="list-card">
                        <div class="list-card-header">
                            <div>
                                <h3>${App.escapeHtml(appointment.doctorName || appointment.doctorname || "Doctor")}</h3>
                                <p class="helper">${App.formatDateTime(appointment.createdAt)}</p>
                            </div>
                            <span class="badge ${App.getStatusClass(appointment.status)}">${App.escapeHtml(appointment.status || "Pending")}</span>
                        </div>
                        <p><strong>Reason:</strong> ${App.escapeHtml(appointment.description || "-")}</p>
                    </article>
                `).join("");
            } catch (error) {
                App.setMessage(message, error.message, "error");
            }
        },

        adminLogin() {
            const form = document.getElementById("adminLoginForm");
            const requestOtpButton = document.getElementById("requestOtpButton");
            const verifyButton = document.getElementById("verifyButton");
            const loginCodeInput = document.getElementById("loginCode");
            const message = document.getElementById("message");

            requestOtpButton.addEventListener("click", async () => {
                const email = document.getElementById("email").value.trim();

                if (!email) {
                    App.setMessage(message, "Enter an admin email first.", "error");
                    return;
                }

                App.setMessage(message, "");

                try {
                    const data = await App.api.adminRequestOtp({ email });
                    const debugOtp = data.data?.debugOtp;

                    loginCodeInput.disabled = false;
                    verifyButton.disabled = false;
                    App.setMessage(
                        message,
                        debugOtp
                            ? `${data.message} OTP: ${debugOtp}`
                            : (data.message || "OTP sent successfully."),
                        "success"
                    );
                } catch (error) {
                    App.setMessage(message, error.message, "error");
                }
            });

            form.addEventListener("submit", async (event) => {
                event.preventDefault();
                App.setMessage(message, "");

                try {
                    const data = await App.api.adminVerifyOtp({
                        email: document.getElementById("email").value.trim(),
                        otp: loginCodeInput.value.trim()
                    });

                    App.saveAdminSession(data.token);
                    window.location.href = "/admin-dashboard/admindashboard.html";
                } catch (error) {
                    App.setMessage(message, error.message, "error");
                }
            });
        },

        adminRegister() {
            const form = document.getElementById("adminSignupForm");
            const message = document.getElementById("message");

            form.addEventListener("submit", async (event) => {
                event.preventDefault();
                App.setMessage(message, "");

                try {
                    const data = await App.api.adminSignup({
                        name: document.getElementById("name").value.trim(),
                        email: document.getElementById("email").value.trim()
                    });

                    App.setMessage(message, data.message || "Admin created successfully.", "success");
                    form.reset();
                    setTimeout(() => {
                        window.location.href = "/admin-dashboard";
                    }, 1000);
                } catch (error) {
                    App.setMessage(message, error.message, "error");
                }
            });
        },

        async adminDashboard() {
            if (!App.requireSession("admin", "/admin-dashboard")) {
                return;
            }
            App.bindSignOut("logoutButton", "admin", "/admin-dashboard");

            const doctorCount = document.getElementById("doctorCount");
            const doctorRows = document.getElementById("doctorRows");
            const message = document.getElementById("message");

            async function loadDoctors() {
                App.setMessage(message, "");

                try {
                    const data = await App.api.listDoctors();
                    const doctors = data.data || [];

                    doctorCount.textContent = `${doctors.length} doctor${doctors.length === 1 ? "" : "s"} in the system`;

                    if (!doctors.length) {
                        doctorRows.innerHTML = '<tr><td colspan="6"><div class="empty-state">No doctors available yet.</div></td></tr>';
                        return;
                    }

                    doctorRows.innerHTML = doctors.map((doctor) => `
                        <tr>
                            <td>
                                <strong>${App.escapeHtml(doctor.name)}</strong><br>
                                <span class="helper">${App.escapeHtml(doctor.degree || "-")}</span>
                            </td>
                            <td>${App.escapeHtml(doctor.specialty || "-")}</td>
                            <td>${App.escapeHtml(doctor.availability || "-")}</td>
                            <td>${App.escapeHtml(doctor.phonenumber || "-")}</td>
                            <td>${App.escapeHtml(doctor.email || "-")}</td>
                            <td><button class="button-small reject" type="button" data-doctor-delete="${doctor._id || doctor.id}">Delete</button></td>
                        </tr>
                    `).join("");
                } catch (error) {
                    doctorCount.textContent = "Doctors";
                    doctorRows.innerHTML = "";
                    App.setMessage(message, error.message, "error");
                }
            }

            doctorRows.addEventListener("click", async (event) => {
                const button = event.target.closest("[data-doctor-delete]");

                if (!button) {
                    return;
                }

                if (!window.confirm("Delete this doctor?")) {
                    return;
                }

                try {
                    const data = await App.api.deleteDoctor(button.dataset.doctorDelete);
                    App.setMessage(message, data.message || "Doctor deleted successfully.", "success");
                    await loadDoctors();
                } catch (error) {
                    App.setMessage(message, error.message, "error");
                }
            });

            await loadDoctors();
        },

        adminAddDoctor() {
            if (!App.requireSession("admin", "/admin-dashboard")) {
                return;
            }
            const form = document.getElementById("doctorForm");
            const message = document.getElementById("message");

            form.addEventListener("submit", async (event) => {
                event.preventDefault();
                App.setMessage(message, "");

                try {
                    const data = await App.api.createDoctor({
                        name: document.getElementById("name").value.trim(),
                        specialty: document.getElementById("specialty").value.trim(),
                        phonenumber: document.getElementById("phonenumber").value.trim(),
                        dateOfBirth: document.getElementById("dateOfBirth").value,
                        address: document.getElementById("address").value.trim(),
                        email: document.getElementById("email").value.trim(),
                        availability: document.getElementById("availability").value.trim(),
                        degree: document.getElementById("degree").value.trim()
                    });

                    App.setMessage(message, data.message || "Doctor added successfully.", "success");
                    form.reset();
                    setTimeout(() => {
                        window.location.href = "/admin-dashboard/admindashboard.html";
                    }, 1000);
                } catch (error) {
                    App.setMessage(message, error.message, "error");
                }
            });
        },

        async adminBookings() {
            if (!App.requireSession("admin", "/admin-dashboard")) {
                return;
            }
            App.bindSignOut("logoutButton", "admin", "/admin-dashboard");

            const bookingCount = document.getElementById("bookingCount");
            const bookingList = document.getElementById("bookingList");
            const pendingCount = document.getElementById("pendingCount");
            const acceptedCount = document.getElementById("acceptedCount");
            const rejectedCount = document.getElementById("rejectedCount");
            const message = document.getElementById("message");

            function updateCounts(bookings) {
                const counts = bookings.reduce((result, booking) => {
                    const status = String(booking.status || "Pending").toLowerCase();

                    if (status === "accepted") {
                        result.accepted += 1;
                    } else if (status === "rejected") {
                        result.rejected += 1;
                    } else {
                        result.pending += 1;
                    }

                    return result;
                }, { pending: 0, accepted: 0, rejected: 0 });

                pendingCount.textContent = counts.pending;
                acceptedCount.textContent = counts.accepted;
                rejectedCount.textContent = counts.rejected;
            }

            async function loadBookings() {
                App.setMessage(message, "");

                try {
                    const data = await App.api.listAllAppointments();
                    const bookings = data.data || [];
                    bookingCount.textContent = `${bookings.length} booking${bookings.length === 1 ? "" : "s"} found`;
                    updateCounts(bookings);

                    if (!bookings.length) {
                        bookingList.innerHTML = '<div class="empty-state">No bookings available yet.</div>';
                        return;
                    }

                    bookingList.innerHTML = bookings.map((booking) => `
                        <article class="list-card">
                            <div class="list-card-header">
                                <div>
                                    <h3>${App.escapeHtml(booking.name)}</h3>
                                    <p class="helper">${App.escapeHtml(booking.email)} · ${App.escapeHtml(booking.phonenumber || "-")}</p>
                                </div>
                                <span class="badge ${App.getStatusClass(booking.status)}">${App.escapeHtml(booking.status || "Pending")}</span>
                            </div>
                            <p><strong>Doctor:</strong> ${App.escapeHtml(booking.doctorName || booking.doctorname || "-")}</p>
                            <p><strong>Date of birth:</strong> ${App.formatDate(booking.dateOfBirth)}</p>
                            <p><strong>Address:</strong> ${App.escapeHtml(booking.address || "-")}</p>
                            <p><strong>Reason:</strong> ${App.escapeHtml(booking.description || "-")}</p>
                            <p><strong>Created:</strong> ${App.formatDateTime(booking.createdAt)}</p>
                            <div class="actions">
                                <button class="button-small accept" type="button" data-booking-status="${booking._id}" data-status-value="Accepted">Accept</button>
                                <button class="button-small reject" type="button" data-booking-status="${booking._id}" data-status-value="Rejected">Reject</button>
                                <button class="button-small complete" type="button" data-booking-status="${booking._id}" data-status-value="Completed">Complete</button>
                            </div>
                        </article>
                    `).join("");
                } catch (error) {
                    bookingCount.textContent = "Bookings";
                    bookingList.innerHTML = "";
                    App.setMessage(message, error.message, "error");
                }
            }

            bookingList.addEventListener("click", async (event) => {
                const button = event.target.closest("[data-booking-status]");

                if (!button) {
                    return;
                }

                try {
                    const data = await App.api.updateAppointmentStatus(
                        button.dataset.bookingStatus,
                        button.dataset.statusValue
                    );
                    App.setMessage(message, data.message || "Status updated successfully.", "success");
                    await loadBookings();
                } catch (error) {
                    App.setMessage(message, error.message, "error");
                }
            });

            await loadBookings();
        }
    },

    initPage() {
        const page = document.body.dataset.page;
        const initializer = this.pages[page];

        if (this.applyRouteGuards(page)) {
            return;
        }

        this.configureNavigation(page);

        if (typeof initializer === "function") {
            initializer();
        }
    }
};

window.App = App;

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => App.initPage());
} else {
    App.initPage();
}
