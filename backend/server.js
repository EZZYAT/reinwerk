


const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

const multer = require("multer");
const path = require("path");
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const session = require("express-session");
const { v2: cloudinary } = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});


const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
        folder: "reinwerk",
        transformation: [
            { width: 1200, crop: "limit" },
            { quality: "auto" },
            { fetch_format: "auto" }
        ],
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        public_id: `${Date.now()}-${file.originalname.split(".")[0]}`,
    }),
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
        image: req.file.path
    });
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "index.html"));
});

// ===== FILES =====
const companiesFile = path.join(__dirname, "data", "companies.json");

// ===== READ / WRITE BOOKINGS =====

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
app.post("/api/login-company", async (req, res) => {
    try {
        const email = (req.body.email || "").trim().toLowerCase();
        const password = (req.body.password || "").trim();

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const { data: company, error } = await supabase
            .from("companies")
            .select("*")
            .eq("email", email)
            .maybeSingle();

        if (error) {
            console.error(error);
            return res.status(500).json({ message: "Database error" });
        }

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
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});
app.post("/api/logout", (req, res) => {
    req.session.destroy(() => {
        res.json({ message: "Logged out" });
    });
});

app.get("/api/company/me", async (req, res) => {
    try {
        if (!req.session.companyId) {
            return res.status(401).json({ message: "Not logged in" });
        }

        const { data: company, error } = await supabase
            .from("companies")
            .select("*")
            .eq("id", req.session.companyId)
            .maybeSingle();

        if (error) {
            console.error(error);
            return res.status(500).json({ message: "Database error" });
        }

        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }

        res.json({
            id: company.id,
            name: company.name,
            email: company.email,
            district: company.district,
            phone: company.phone,
            price: company.price,
            rating: company.rating,
            image: company.image,
            type: company.type,
            teamSize: company.team_size,
            description: company.description,
            services: company.services || [],
            languages: company.languages || [],
            experience: company.experience,
            availability: company.availability
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// ===== REGISTER COMPANY =====
app.post("/api/register-company", async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            district,
            phone,
            price,
            rating,
            image,
            type,
            teamSize,
            description,
            services,
            languages,
            experience,
            availability
        } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email and password are required" });
        }

        const normalizedEmail = String(email).trim().toLowerCase();

        const { data: existing, error: existingError } = await supabase
            .from("companies")
            .select("id")
            .eq("email", normalizedEmail)
            .maybeSingle();

        if (existingError) {
            console.error(existingError);
            return res.status(500).json({ message: "Database error" });
        }

        if (existing) {
            return res.status(400).json({ message: "Email already exists" });
        }

        const { data, error } = await supabase
            .from("companies")
            .insert([
                {
                    name: name || "",
                    email: normalizedEmail,
                    password: String(password),
                    district: district || "",
                    phone: phone || "",
                    price: price || "",
                    rating: Number(rating || 0),
                    image: image || "",
                    type: type || "team",
                    team_size: Number(teamSize || 1),
                    description: description || "",
                    services: Array.isArray(services) ? services : [],
                    languages: Array.isArray(languages) ? languages : [],
                    experience: experience || "",
                    availability: availability || ""
                }
            ])
            .select()
            .single();

        if (error) {
            console.error(error);
            return res.status(500).json({ message: "Failed to register company" });
        }

        res.json({
            message: "Company registered successfully",
            company: data
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
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
app.put("/api/company/profile", async (req, res) => {
    try {
        if (!req.session.companyId) {
            return res.status(401).json({ message: "Not logged in" });
        }

        const {
            name,
            district,
            email,
            phone,
            price,
            teamSize,
            description,
            services,
            languages,
            image
        } = req.body;

        const normalizedEmail = (email || "").trim().toLowerCase();

        const { data: existingWithEmail, error: emailCheckError } = await supabase
            .from("companies")
            .select("id")
            .eq("email", normalizedEmail)
            .neq("id", req.session.companyId)
            .maybeSingle();

        if (emailCheckError) {
            console.error(emailCheckError);
            return res.status(500).json({ message: "Database error" });
        }

        if (existingWithEmail) {
            return res.status(400).json({ message: "Email already used by another company" });
        }

        const { data, error } = await supabase
            .from("companies")
            .update({
                name: name || "",
                district: district || "",
                email: normalizedEmail,
                phone: phone || "",
                price: price || "",
                team_size: Number(teamSize || 1),
                description: description || "",
                services: Array.isArray(services) ? services : [],
                languages: Array.isArray(languages) ? languages : [],
                image: image || ""
            })
            .eq("id", req.session.companyId)
            .select()
            .single();

        if (error) {
            console.error(error);
            return res.status(500).json({ message: "Update failed" });
        }

        res.json({
            message: "Profile updated successfully",
            company: {
                id: data.id,
                name: data.name,
                email: data.email,
                district: data.district,
                phone: data.phone,
                price: data.price,
                rating: data.rating,
                image: data.image,
                type: data.type,
                teamSize: data.team_size,
                description: data.description,
                services: data.services || [],
                languages: data.languages || [],
                experience: data.experience,
                availability: data.availability
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
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
app.post("/api/bookings", async (req, res) => {
    try {

        const {
            companyId,
            customerName,
            customerPhone,
            customerEmail,
            service,
            bookingDate,
            bookingTime,
            message
        } = req.body;

        if (!companyId || !customerName || !bookingDate || !bookingTime) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const { data, error } = await supabase
            .from("bookings")
            .insert([
                {
                    company_id: Number(companyId),
                    customer_name: customerName,
                    customer_phone: customerPhone || "",
                    customer_email: customerEmail || "",
                    service: service || "",
                    booking_date: bookingDate,
                    booking_time: bookingTime,
                    message: message || ""
                }
            ])
            .select()
            .single();

        if (error) {
            console.error(error);
            return res.status(500).json({ message: "Failed to create booking" });
        }

        res.json({
            message: "Booking created",
            booking: data
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.get("/api/bookings", (req, res) => {
    res.json(readBookings());
});

app.get("/api/company/bookings", async (req, res) => {

    try {

        const companyId = req.session.companyId;

        if (!companyId) {
            return res.status(401).json({ message: "Not logged in" });
        }

        const { data, error } = await supabase
            .from("bookings")
            .select("*")
            .eq("company_id", companyId)
            .order("created_at", { ascending: false });

        if (error) {
            console.error(error);
            return res.status(500).json({ message: "Failed to load bookings" });
        }

        res.json(data);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }

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