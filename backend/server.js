const multer = require("multer");
const path = require("path");
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const session = require("express-session");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "images/uploads");
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({ storage });

const app = express();
const PORT = 3000;

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());
app.use("/images", express.static("images"));

app.use(session({
    secret: "reinwerk_secret_123",
    resave: false,
    saveUninitialized: false
}));

// ===== STATIC FILES =====
app.use(express.static(path.join(__dirname, "..")));

app.post("/api/upload", upload.single("image"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No image uploaded" });
    }

    res.json({
        image: "/images/uploads/" + req.file.filename
    });
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "index.html"));
});

// ===== FILES =====
const bookingsFile = path.join(__dirname, "data", "bookings.json");
const companiesFile = path.join(__dirname, "data", "companies.json");

// ===== READ / WRITE BOOKINGS =====
function readBookings() {
    try {
        if (!fs.existsSync(bookingsFile)) return [];
        const raw = fs.readFileSync(bookingsFile, "utf-8");
        if (!raw.trim()) return [];
        return JSON.parse(raw);
    } catch (e) {
        console.error("Error reading bookings:", e);
        return [];
    }
}

function saveBookings(bookings) {
    try {
        fs.writeFileSync(bookingsFile, JSON.stringify(bookings, null, 2), "utf-8");
    } catch (e) {
        console.error("Error saving bookings:", e);
    }
}

// ===== READ / WRITE COMPANIES =====
function readCompanies() {
    try {
        if (!fs.existsSync(companiesFile)) return [];
        const raw = fs.readFileSync(companiesFile, "utf-8");
        if (!raw.trim()) return [];
        return JSON.parse(raw);
    } catch (e) {
        console.error("Error reading companies:", e);
        return [];
    }
}

function saveCompanies(companies) {
    try {
        fs.writeFileSync(companiesFile, JSON.stringify(companies, null, 2), "utf-8");
    } catch (e) {
        console.error("Error saving companies:", e);
    }
}

// ===== AUTH =====
app.post("/api/login-company", (req, res) => {
    const email = (req.body.email || "").trim().toLowerCase();
    const password = (req.body.password || "").trim();

    const companies = readCompanies();
    const company = companies.find(c => (c.email || "").trim().toLowerCase() === email);

    if (!company) {
        return res.status(400).json({ message: "Email not found" });
    }

    if (company.password !== password) {
        return res.status(401).json({ message: "Wrong password" });
    }

    req.session.companyId = company.id;

    res.json({
        message: "Logged in",
        companyId: company.id,
        companyName: company.name
    });
});

app.post("/api/logout", (req, res) => {
    req.session.destroy(() => {
        res.json({ message: "Logged out" });
    });
});

app.get("/api/company/me", (req, res) => {
    const currentCompanyId = req.session.companyId;

    if (!currentCompanyId) {
        return res.status(401).json({ message: "Not logged in" });
    }

    const companies = readCompanies();
    const company = companies.find(c => Number(c.id) === Number(currentCompanyId));

    if (!company) {
        return res.status(404).json({ message: "Company not found" });
    }

    res.json(company);
});

// ===== REGISTER COMPANY =====
app.post("/api/register-company", (req, res) => {
    const name = (req.body.name || "").trim();
    const email = (req.body.email || "").trim().toLowerCase();
    const password = (req.body.password || "").trim();
    const district = (req.body.district || "").trim();
    const phone = (req.body.phone || "").trim();
    const description = (req.body.description || "").trim();

    const teamSize = Number(req.body.teamSize || 1);
    const price = (req.body.price || "").trim() || "ab 0€";

    const languages = Array.isArray(req.body.languages) && req.body.languages.length
        ? req.body.languages
        : ["DE"];

    const services = Array.isArray(req.body.services) && req.body.services.length
        ? req.body.services
        : ["Reinigung"];

    const companies = readCompanies();

    if (!name || !email || !password || !district || !phone) {
        return res.status(400).json({ message: "Please fill all required fields" });
    }

    const exists = companies.find(c => (c.email || "").trim().toLowerCase() === email);
    if (exists) {
        return res.status(400).json({ message: "Email already exists" });
    }

    const newCompany = {
        id: Date.now(),
        name,
        email,
        password,
        district,
        price,
        rating: 0,
        phone,
        image: "",
        type: "team",
        teamSize,
        description: description || "Neue Firma bei ReinWerk",
        services,
        languages,
        experience: "Neu",
        availability: "Nach Vereinbarung"
    };

    companies.push(newCompany);
    saveCompanies(companies);

    res.status(201).json({
        message: "Company registered successfully",
        company: newCompany
    });
});

// ===== RESET PASSWORD =====
app.post("/api/reset-password", (req, res) => {
    const { email, newPassword } = req.body;

    const companies = readCompanies();
    const company = companies.find(c => (c.email || "").trim().toLowerCase() === (email || "").trim().toLowerCase());

    if (!company) {
        return res.status(404).json({ message: "Email not found" });
    }

    if (!newPassword || newPassword.length < 4) {
        return res.status(400).json({ message: "Password must be at least 4 characters" });
    }

    company.password = newPassword;
    saveCompanies(companies);

    res.json({ message: "Password updated successfully" });
});

// ===== COMPANY SELF UPDATE =====
app.put("/api/company/profile", (req, res) => {
    const currentCompanyId = req.session.companyId;

    if (!currentCompanyId) {
        return res.status(401).json({ message: "Not logged in" });
    }

    const companies = readCompanies();
    const index = companies.findIndex(c => Number(c.id) === Number(currentCompanyId));

    if (index === -1) {
        return res.status(404).json({ message: "Company not found" });
    }

    const current = companies[index];
    const nextEmail = (req.body.email || "").trim().toLowerCase();

    const emailTaken = companies.find(c =>
        Number(c.id) !== Number(currentCompanyId) &&
        (c.email || "").trim().toLowerCase() === nextEmail
    );

    if (emailTaken) {
        return res.status(400).json({ message: "Email already exists" });
    }

    companies[index] = {
        ...current,
        name: (req.body.name || current.name).trim(),
        district: (req.body.district || current.district).trim(),
        email: nextEmail || current.email,
        phone: (req.body.phone || current.phone).trim(),
        price: (req.body.price || current.price).trim(),
        teamSize: Number(req.body.teamSize || current.teamSize || 1),
        description: (req.body.description || current.description).trim(),
        image: (req.body.image || current.image || "").trim(),
        languages: Array.isArray(req.body.languages) && req.body.languages.length
            ? req.body.languages
            : current.languages,
        services: Array.isArray(req.body.services) && req.body.services.length
            ? req.body.services
            : current.services
    };

    saveCompanies(companies);

    res.json({
        message: "Profile updated successfully",
        company: companies[index]
    });
});

// ===== DELETE OWN ACCOUNT =====
app.delete("/api/company/account", (req, res) => {
    const currentCompanyId = req.session.companyId;

    if (!currentCompanyId) {
        return res.status(401).json({ message: "Not logged in" });
    }

    const companies = readCompanies();
    const newCompanies = companies.filter(c => Number(c.id) !== Number(currentCompanyId));
    saveCompanies(newCompanies);

    const bookings = readBookings();
    const newBookings = bookings.filter(b => Number(b.companyId) !== Number(currentCompanyId));
    saveBookings(newBookings);

    req.session.destroy(() => {
        res.json({ message: "Account deleted" });
    });
});

// ===== COMPANIES API =====
app.get("/api/companies", (req, res) => {
    res.json(readCompanies());
});

app.get("/api/companies/:id", (req, res) => {
    const id = Number(req.params.id);
    const companies = readCompanies();
    const company = companies.find(c => Number(c.id) === id);

    if (!company) {
        return res.status(404).json({ message: "Company not found" });
    }

    res.json(company);
});

// ===== BOOKINGS API =====
app.post("/api/bookings", (req, res) => {
    const { companyId, date, time, address, note } = req.body;
    const cid = Number(companyId);

    const companies = readCompanies();

    if (!cid || !companies.find(c => Number(c.id) === cid)) {
        return res.status(400).json({ message: "Invalid companyId" });
    }

    if (!date || !time || !address) {
        return res.status(400).json({ message: "date, time, address are required" });
    }

    const bookings = readBookings();

    const booking = {
        id: Date.now(),
        companyId: cid,
        date,
        time,
        address,
        note: note || "",
        status: "Pending",
        createdAt: new Date().toISOString()
    };

    bookings.push(booking);
    saveBookings(bookings);

    res.status(201).json({ message: "Booking saved", booking });
});

app.get("/api/bookings", (req, res) => {
    res.json(readBookings());
});

app.get("/api/company/bookings", (req, res) => {
    const currentCompanyId = req.session.companyId;

    if (!currentCompanyId) {
        return res.status(401).json({ message: "Not logged in" });
    }

    const bookings = readBookings();

    const myBookings = bookings.filter(
        b => Number(b.companyId) === Number(currentCompanyId)
    );

    res.json(myBookings);
});

app.get("/api/bookings/:id", (req, res) => {
    const id = Number(req.params.id);
    const bookings = readBookings();
    const booking = bookings.find(b => Number(b.id) === id);

    if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
    }

    res.json(booking);
});

app.put("/api/bookings/:id", (req, res) => {
    const id = Number(req.params.id);
    const { date, time, address, note } = req.body;

    const bookings = readBookings();
    const index = bookings.findIndex(b => Number(b.id) === id);

    if (index === -1) {
        return res.status(404).json({ message: "Booking not found" });
    }

    if (!date || !time || !address) {
        return res.status(400).json({ message: "date, time, address are required" });
    }

    bookings[index] = {
        ...bookings[index],
        date,
        time,
        address,
        note: note || "",
        updatedAt: new Date().toISOString()
    };

    saveBookings(bookings);
    res.json({ message: "Booking updated", booking: bookings[index] });
});

app.delete("/api/bookings/:id", (req, res) => {
    const id = Number(req.params.id);

    const bookings = readBookings();
    const newBookings = bookings.filter(b => Number(b.id) !== id);

    if (newBookings.length === bookings.length) {
        return res.status(404).json({ message: "Booking not found" });
    }

    saveBookings(newBookings);
    res.json({ message: "Booking deleted", id });
});

// ===== ADMIN DELETE COMPANY =====
app.delete("/api/admin/companies/:id", (req, res) => {
    const id = Number(req.params.id);

    const companies = readCompanies();
    const newCompanies = companies.filter(c => Number(c.id) !== id);

    if (newCompanies.length === companies.length) {
        return res.status(404).json({ message: "Company not found" });
    }

    saveCompanies(newCompanies);

    const bookings = readBookings();
    const newBookings = bookings.filter(b => Number(b.companyId) !== id);
    saveBookings(newBookings);

    res.json({ message: "Company deleted", id });
});

// ===== START =====
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});