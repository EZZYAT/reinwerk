const path = require("path");
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);
console.log("SUPABASE_URL_DEBUG:", JSON.stringify(process.env.SUPABASE_URL));

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
            { fetch_format: "auto" },
        ],
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        public_id: `${Date.now()}-${file.originalname
            .split(".")[0]
            .replace(/\s+/g, "-")}`,
    }),
});

const upload = multer({ storage });

app.set("trust proxy", 1);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
    session({
        secret: "reinwerk_secret_123",
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: false,
            httpOnly: true,
            sameSite: "lax",
        },
    })
);

app.use("/images", express.static("images"));
app.use(express.static(path.join(__dirname, "..")));

function normalizeCompany(company) {
    if (!company) return null;

    return {
        id: company.id,
        name: company.name || "",
        email: company.email || "",
        password: company.password || "",
        district: company.district || "",
        phone: company.phone || "",
        price: company.price || "",
        rating: company.rating || 0,
        image: company.image || "",
        type: company.type || "team",
        teamSize: company.team_size || 1,
        description: company.description || "",
        services: Array.isArray(company.services) ? company.services : [],
        languages: Array.isArray(company.languages) ? company.languages : [],
        experience: company.experience || "",
        availability: company.availability || "",
        createdAt: company.created_at || null,
    };
}

function normalizeBooking(booking) {
    if (!booking) return null;

    return {
        id: booking.id,
        companyId: booking.company_id,
        customerName: booking.customer_name || "",
        customerPhone: booking.customer_phone || "",
        customerEmail: booking.customer_email || "",
        service: booking.service || "",
        date: booking.booking_date || "",
        time: booking.booking_time || "",
        message: booking.message || "",
        status: booking.status || "pending",
        createdAt: booking.created_at || null,
    };
}

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "index.html"));
});

app.post("/api/upload", upload.single("image"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No image uploaded" });
    }

    res.json({
        image: req.file.path,
    });
});

app.post("/api/login-company", async (req, res) => {
    try {
        const email = (req.body.email || "").trim().toLowerCase();
        const password = (req.body.password || "").trim();

        if (!email || !password) {
            return res
                .status(400)
                .json({ message: "Email and password are required" });
        }

        const { data: company, error } = await supabase
            .from("companies")
            .select("*")
            .eq("email", email)
            .maybeSingle();

        if (error) {
            console.error("LOGIN ERROR:", error);
            return res.status(500).json({ message: "Database error" });
        }

        if (!company) {
            return res.status(400).json({ message: "Email not found" });
        }

        if ((company.password || "").trim() !== password) {
            return res.status(401).json({ message: "Wrong password" });
        }

        req.session.companyId = company.id;

        res.json({
            message: "Logged in",
            companyId: company.id,
            companyName: company.name,
        });
    } catch (err) {
        console.error("LOGIN SERVER ERROR:", err);
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
            console.error("COMPANY ME ERROR:", error);
            return res.status(500).json({ message: "Database error" });
        }

        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }

        res.json(normalizeCompany(company));
    } catch (err) {
        console.error("COMPANY ME SERVER ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
});

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
            availability,
        } = req.body;

        if (!name || !email || !password) {
            return res
                .status(400)
                .json({ message: "Name, email and password are required" });
        }

        const normalizedEmail = String(email).trim().toLowerCase();

        const { data: existing, error: existingError } = await supabase
            .from("companies")
            .select("id")
            .eq("email", normalizedEmail)
            .maybeSingle();

        if (existingError) {
            console.error("REGISTER CHECK ERROR:", existingError);
            return res.status(500).json({
                message: "Database error",
                supabaseError: existingError.message,
                details: existingError.details,
                hint: existingError.hint,
            });
        }

        if (existing) {
            return res.status(400).json({ message: "Email already exists" });
        }

        const servicesArray = Array.isArray(services)
            ? services
            : String(services || "")
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);

        const languagesArray = Array.isArray(languages)
            ? languages
            : String(languages || "")
                .split(",")
                .map((l) => l.trim())
                .filter(Boolean);

        const insertPayload = {
            name: String(name || "").trim(),
            email: normalizedEmail,
            password: String(password || "").trim(),
            district: String(district || "").trim(),
            phone: String(phone || "").trim(),
            price: String(price || "").trim(),
            rating: Number(rating || 0),
            image: String(image || "").trim(),
            type: String(type || "team").trim(),
            team_size: Number(teamSize || 1),
            description: String(description || "").trim(),
            services: servicesArray,
            languages: languagesArray,
            experience: String(experience || "").trim(),
            availability: String(availability || "").trim(),
        };

        const { data, error } = await supabase
            .from("companies")
            .insert([insertPayload])
            .select()
            .single();

        if (error) {
            console.error("REGISTER INSERT ERROR:", error);
            return res.status(500).json({
                message: "Database error",
                supabaseError: error.message,
                details: error.details,
                hint: error.hint,
            });
        }

        res.json({
            message: "Company registered successfully",
            company: normalizeCompany(data),
        });
    } catch (err) {
        console.error("REGISTER SERVER ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
});
app.post("/api/register-user", async (req, res) => {
    try {

        const { name, email, password, phone, image } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required"
            });
        }

        const normalizedEmail = String(email).trim().toLowerCase();

        const { data: existing } = await supabase
            .from("users")
            .select("id")
            .eq("email", normalizedEmail)
            .maybeSingle();

        if (existing) {
            return res.status(400).json({
                message: "Email already exists"
            });
        }

        const { data, error } = await supabase
            .from("users")
            .insert([{
                name: String(name).trim(),
                email: normalizedEmail,
                password: String(password).trim(),
                phone: String(phone || "").trim(),
                image: String(image || "").trim()
            }])
            .select()
            .single();

        if (error) {
            console.error("REGISTER USER ERROR:", error);
            return res.status(500).json({
                message: "Database error"
            });
        }

        res.json({
            message: "User registered successfully",
            user: data
        });

    } catch (err) {
        console.error("REGISTER USER SERVER ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
});
app.post("/api/login-user", async (req, res) => {
    try {
        const email = (req.body.email || "").trim().toLowerCase();
        const password = (req.body.password || "").trim();

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const { data: user, error } = await supabase
            .from("users")
            .select("*")
            .eq("email", email)
            .maybeSingle();

        if (error) {
            console.error("LOGIN USER ERROR:", error);
            return res.status(500).json({
                message: "Database error"
            });
        }

        if (!user) {
            return res.status(400).json({
                message: "Email not found"
            });
        }

        if ((user.password || "").trim() !== password) {
            return res.status(401).json({
                message: "Wrong password"
            });
        }

        req.session.userId = user.id;

        res.json({
            message: "User logged in",

            userId: user.id,
            userName: user.name
        });

    } catch (err) {
        console.error("LOGIN USER SERVER ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
});
app.get("/api/user/me", async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({
                message: "Not logged in"
            });
        }

        const { data: user, error } = await supabase
            .from("users")
            .select("*")
            .eq("id", req.session.userId)
            .maybeSingle();

        if (error) {
            console.error("USER ME ERROR:", error);
            return res.status(500).json({
                message: "Database error"
            });
        }

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            image: user.image || ""
        });

    } catch (err) {
        console.error("USER ME SERVER ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
});

app.post("/api/reset-password", async (req, res) => {
    try {
        const email = (req.body.email || "").trim().toLowerCase();
        const newPassword = (req.body.newPassword || "").trim();

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        if (!newPassword || newPassword.length < 4) {
            return res
                .status(400)
                .json({ message: "Password must be at least 4 characters" });
        }

        const { data, error } = await supabase
            .from("companies")
            .update({ password: newPassword })
            .eq("email", email)
            .select("id")
            .maybeSingle();

        if (error) {
            console.error("RESET PASSWORD ERROR:", error);
            return res.status(500).json({ message: "Database error" });
        }

        if (!data) {
            return res.status(404).json({ message: "Email not found" });
        }

        res.json({ message: "Password updated successfully" });
    } catch (err) {
        console.error("RESET PASSWORD SERVER ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
});

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
            image,
            experience,
            availability,
        } = req.body;

        const normalizedEmail = (email || "").trim().toLowerCase();

        const { data: existingWithEmail, error: emailCheckError } = await supabase
            .from("companies")
            .select("id")
            .eq("email", normalizedEmail)
            .neq("id", req.session.companyId)
            .maybeSingle();

        if (emailCheckError) {
            console.error("PROFILE EMAIL CHECK ERROR:", emailCheckError);
            return res.status(500).json({ message: "Database error" });
        }

        if (existingWithEmail) {
            return res
                .status(400)
                .json({ message: "Email already used by another company" });
        }

        const servicesArray = Array.isArray(services)
            ? services
            : String(services || "")
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);

        const languagesArray = Array.isArray(languages)
            ? languages
            : String(languages || "")
                .split(",")
                .map((l) => l.trim())
                .filter(Boolean);

        const { data, error } = await supabase
            .from("companies")
            .update({
                name: String(name || "").trim(),
                district: String(district || "").trim(),
                email: normalizedEmail,
                phone: String(phone || "").trim(),
                price: String(price || "").trim(),
                team_size: Number(teamSize || 1),
                description: String(description || "").trim(),
                services: servicesArray,
                languages: languagesArray,
                image: String(image || "").trim(),
                experience: String(experience || "").trim(),
                availability: String(availability || "").trim(),
            })
            .eq("id", req.session.companyId)
            .select()
            .single();

        if (error) {
            console.error("PROFILE UPDATE ERROR:", error);
            return res.status(500).json({ message: "Update failed" });
        }

        res.json({
            message: "Profile updated successfully",
            company: normalizeCompany(data),
        });
    } catch (err) {
        console.error("PROFILE UPDATE SERVER ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
});

app.delete("/api/company/account", async (req, res) => {
    try {
        const currentCompanyId = req.session.companyId;

        if (!currentCompanyId) {
            return res.status(401).json({ message: "Not logged in" });
        }

        const { error: bookingsError } = await supabase
            .from("bookings")
            .delete()
            .eq("company_id", currentCompanyId);

        if (bookingsError) {
            console.error("DELETE ACCOUNT BOOKINGS ERROR:", bookingsError);
            return res.status(500).json({ message: "Failed to delete bookings" });
        }

        const { error: companyError } = await supabase
            .from("companies")
            .delete()
            .eq("id", currentCompanyId);

        if (companyError) {
            console.error("DELETE ACCOUNT COMPANY ERROR:", companyError);
            return res.status(500).json({ message: "Failed to delete company" });
        }

        req.session.destroy(() => {
            res.json({ message: "Account deleted" });
        });
    } catch (err) {
        console.error("DELETE ACCOUNT SERVER ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
});

app.get("/api/companies", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("companies")
            .select("*")
            .order("id", { ascending: true });

        if (error) {
            console.error("GET COMPANIES ERROR:", error);
            return res.status(500).json({ message: "Database error" });
        }

        res.json((data || []).map(normalizeCompany));
    } catch (err) {
        console.error("GET COMPANIES SERVER ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
});

app.get("/api/companies/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        const { data, error } = await supabase
            .from("companies")
            .select("*")
            .eq("id", id)
            .maybeSingle();

        if (error) {
            console.error("GET COMPANY ERROR:", error);
            return res.status(500).json({ message: "Database error" });
        }

        if (!data) {
            return res.status(404).json({ message: "Company not found" });
        }

        res.json(normalizeCompany(data));
    } catch (err) {
        console.error("GET COMPANY SERVER ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
});

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
            message,
        } = req.body;

        if (!companyId || !customerName || !bookingDate || !bookingTime) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const { data, error } = await supabase
            .from("bookings")
            .insert([
                {
                    company_id: Number(companyId),
                    customer_name: String(customerName || "").trim(),
                    customer_phone: String(customerPhone || "").trim(),
                    customer_email: String(customerEmail || "").trim(),
                    service: String(service || "").trim(),
                    booking_date: String(bookingDate || "").trim(),
                    booking_time: String(bookingTime || "").trim(),
                    message: String(message || "").trim(),
                },
            ])
            .select()
            .single();

        if (error) {
            console.error("CREATE BOOKING ERROR:", error);
            return res.status(500).json({ message: "Failed to create booking" });
        }

        res.json({
            message: "Booking created",
            booking: normalizeBooking(data),
        });
    } catch (err) {
        console.error("CREATE BOOKING SERVER ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
});

app.get("/api/bookings", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("bookings")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("GET BOOKINGS ERROR:", error);
            return res.status(500).json({ message: "Database error" });
        }

        res.json((data || []).map(normalizeBooking));
    } catch (err) {
        console.error("GET BOOKINGS SERVER ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
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
            console.error("GET COMPANY BOOKINGS ERROR:", error);
            return res.status(500).json({ message: "Failed to load bookings" });
        }

        res.json((data || []).map(normalizeBooking));
    } catch (err) {
        console.error("GET COMPANY BOOKINGS SERVER ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
});

app.get("/api/bookings/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        const { data, error } = await supabase
            .from("bookings")
            .select("*")
            .eq("id", id)
            .maybeSingle();

        if (error) {
            console.error("GET BOOKING ERROR:", error);
            return res.status(500).json({ message: "Database error" });
        }

        if (!data) {
            return res.status(404).json({ message: "Booking not found" });
        }

        res.json(normalizeBooking(data));
    } catch (err) {
        console.error("GET BOOKING SERVER ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
});

app.put("/api/bookings/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { date, time, message, status } = req.body;

        const { data, error } = await supabase
            .from("bookings")
            .update({
                booking_date: String(date || "").trim(),
                booking_time: String(time || "").trim(),
                message: String(message || "").trim(),
                status: String(status || "pending").trim(),
            })
            .eq("id", id)
            .select()
            .maybeSingle();

        if (error) {
            console.error("UPDATE BOOKING ERROR:", error);
            return res.status(500).json({ message: "Update failed" });
        }

        if (!data) {
            return res.status(404).json({ message: "Booking not found" });
        }

        res.json({
            message: "Booking updated",
            booking: normalizeBooking(data),
        });
    } catch (err) {
        console.error("UPDATE BOOKING SERVER ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
});

app.delete("/api/bookings/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        const { data, error } = await supabase
            .from("bookings")
            .delete()
            .eq("id", id)
            .select()
            .maybeSingle();

        if (error) {
            console.error("DELETE BOOKING ERROR:", error);
            return res.status(500).json({ message: "Delete failed" });
        }

        if (!data) {
            return res.status(404).json({ message: "Booking not found" });
        }

        res.json({ message: "Booking deleted", id });
    } catch (err) {
        console.error("DELETE BOOKING SERVER ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
});

app.delete("/api/admin/companies/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        const { error: bookingsError } = await supabase
            .from("bookings")
            .delete()
            .eq("company_id", id);

        if (bookingsError) {
            console.error("ADMIN DELETE BOOKINGS ERROR:", bookingsError);
            return res.status(500).json({ message: "Failed to delete company bookings" });
        }

        const { data, error } = await supabase
            .from("companies")
            .delete()
            .eq("id", id)
            .select()
            .maybeSingle();

        if (error) {
            console.error("ADMIN DELETE COMPANY ERROR:", error);
            return res.status(500).json({ message: "Delete failed" });
        }

        if (!data) {
            return res.status(404).json({ message: "Company not found" });
        }

        res.json({ message: "Company deleted", id });
    } catch (err) {
        console.error("ADMIN DELETE COMPANY SERVER ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});