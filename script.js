const API_BASE = "https://reinwerk.onrender.com";
let companies = [];

function $(id) {
    return document.getElementById(id);
}

// ===== NAVBAR EFFECTS =====
(function initNavbar() {
    const navbar = $("navbar");
    const navToggle = $("navToggle");
    const navLinks = $("navLinks");

    window.addEventListener("scroll", () => {
        if (!navbar) return;
        if (window.scrollY > 10) navbar.classList.add("scrolled");
        else navbar.classList.remove("scrolled");
    });

    if (navToggle && navLinks) {
        navToggle.addEventListener("click", () => {
            navLinks.classList.toggle("open");
        });

        navLinks.querySelectorAll("a").forEach((a) => {
            a.addEventListener("click", () => {
                navLinks.classList.remove("open");
            });
        });
    }
})();

// ===== NAVBAR PROFILE =====
async function loadNavbarProfile() {
    const navProfile = $("navProfile");
    const navLoginBtn = $("navLoginBtn");

    const navProfileImage = $("navProfileImage");
    const navProfileName = $("navProfileName");
    const navProfileType = $("navProfileType");
    const navProfileLink = $("navProfileLink");
    const navDashboardLink = $("navDashboardLink");
    const navLogoutBtn = $("navLogoutBtn");

    if (!navProfile) return;

    try {
        // ===== USER =====
        const userRes = await fetch(`${API_BASE}/api/user/me`, {
            credentials: "include"
        });

        if (userRes.ok) {
            const user = await userRes.json();

            if (navLoginBtn) navLoginBtn.style.display = "none";
            navProfile.style.display = "flex";

            if (navProfileImage) {
                navProfileImage.src = user.image || "https://via.placeholder.com/80?text=User";
            }
            if (navProfileName) {
                navProfileName.textContent = user.name || "User";
            }
            if (navProfileType) {
                navProfileType.textContent = "Kunde";
            }
            if (navProfileLink) {
                navProfileLink.href = "user-profile.html";
            }
            if (navDashboardLink) {
                navDashboardLink.href = "user-profile.html";
            }
            if (navLogoutBtn) {
                navLogoutBtn.style.display = "block";
                navLogoutBtn.onclick = async () => {
                    await fetch(`${API_BASE}/api/logout`, {
                        method: "POST",
                        credentials: "include"
                    });
                    window.location.href = "index.html";
                };
            }

            return;
        }

        // ===== COMPANY =====
        const companyRes = await fetch(`${API_BASE}/api/company/me`, {
            credentials: "include"
        });

        if (companyRes.ok) {
            const company = await companyRes.json();

            if (navLoginBtn) navLoginBtn.style.display = "none";
            navProfile.style.display = "flex";

            if (navProfileImage) {
                navProfileImage.src = company.image || "https://via.placeholder.com/80?text=Firma";
            }
            if (navProfileName) {
                navProfileName.textContent = company.name || "Company";
            }
            if (navProfileType) {
                navProfileType.textContent = "Firma";
            }
            if (navProfileLink) {
                navProfileLink.href = "company-profile.html";
            }
            if (navDashboardLink) {
                navDashboardLink.href = "company.html";
            }
            if (navLogoutBtn) {
                navLogoutBtn.style.display = "block";
                navLogoutBtn.onclick = async () => {
                    await fetch(`${API_BASE}/api/logout`, {
                        method: "POST",
                        credentials: "include"
                    });
                    window.location.href = "index.html";
                };
            }

            return;
        }

        // ===== GUEST =====
        navProfile.style.display = "none";
        if (navLoginBtn) {
            navLoginBtn.style.display = "inline-flex";
        }

    } catch (err) {
        console.error("Navbar profile error:", err);
        if (navProfile) navProfile.style.display = "none";
        if (navLoginBtn) navLoginBtn.style.display = "inline-flex";
    }
}

// ===== COUNTDOWN =====
(function initCountdown() {
    const daysEl = $("days");
    const hoursEl = $("hours");
    const minutesEl = $("minutes");
    const secondsEl = $("seconds");

    if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

    const endDate = new Date("2026-05-08T23:59:59").getTime();

    function updateCountdown() {
        const now = Date.now();
        const diff = endDate - now;

        if (diff <= 0) {
            daysEl.textContent = "00";
            hoursEl.textContent = "00";
            minutesEl.textContent = "00";
            secondsEl.textContent = "00";
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);

        daysEl.textContent = String(days).padStart(2, "0");
        hoursEl.textContent = String(hours).padStart(2, "0");
        minutesEl.textContent = String(minutes).padStart(2, "0");
        secondsEl.textContent = String(seconds).padStart(2, "0");
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);
})();

// ===== INDEX: RENDER COMPANIES =====
function renderCompanies(list) {
    const container = $("companies");
    if (!container) return;

    container.innerHTML = "";

    if (!Array.isArray(list) || !list.length) {
        container.innerHTML = `
            <div class="company-card">
                <div class="company-info">
                    <h3>Keine Firmen gefunden</h3>
                </div>
            </div>
        `;
        return;
    }

    list.forEach((company) => {
        const card = document.createElement("div");
        card.className = "company-card";

        const image = company.image || "https://via.placeholder.com/400x250?text=ReinWerk";
        const name = company.name || "Unbekannte Firma";
        const district = company.district || "-";
        const rating = company.rating ?? "0";
        const price = company.price || "-";
        const phone = company.phone || "";

        card.innerHTML = `
            <div class="company-info">
                <h3>${name}</h3>

                <div class="company-meta">
                    <div>📍 ${district}</div>
                    <div>⭐ ${rating}</div>
                    <div class="company-price">${price}</div>
                </div>

                <div class="company-actions">
                    <a class="btn btn-primary" href="profile.html?id=${company.id}">Profil</a>
                    <a class="btn" href="${phone ? `tel:${phone}` : '#'}">Anrufen</a>
                </div>
            </div>

            <img class="company-thumb" src="${image}" alt="${name}">
        `;

        container.appendChild(card);
    });
}

// ===== LOAD COMPANIES =====
async function loadCompanies() {
    const container = $("companies");
    if (!container) return;

    try {
        const res = await fetch(`${API_BASE}/api/companies`);
        const data = await res.json();

        companies = Array.isArray(data) ? data : [];

        renderCompanies(companies);
        initSearch();
    } catch (error) {
        console.error("Error loading companies:", error);
    }
}

// ===== SEARCH =====
function initSearch() {
    const searchInput = $("search");
    const container = $("companies");

    if (!searchInput || !container) return;

    searchInput.addEventListener("input", () => {
        const v = searchInput.value.toLowerCase().trim();

        const filtered = companies.filter((c) =>
            (c.name || "").toLowerCase().includes(v) ||
            (c.district || "").toLowerCase().includes(v) ||
            (c.services || []).join(" ").toLowerCase().includes(v)
        );

        renderCompanies(filtered);
    });
}

// ===== PROFILE PAGE =====
async function initProfile() {
    const profileBox = $("profileBox");
    if (!profileBox) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) {
        if ($("pName")) $("pName").textContent = "Firma nicht gefunden";
        if ($("pAbout")) $("pAbout").textContent = "Bitte zurück zur Liste.";
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/companies/${id}`);
        if (!res.ok) throw new Error("Company not found");

        const company = await res.json();

        if ($("pName")) $("pName").textContent = company.name || "-";
        if ($("pAbout")) $("pAbout").textContent = company.description || "-";
        if ($("pDistrict")) $("pDistrict").textContent = company.district || "-";
        if ($("pType")) $("pType").textContent = company.type === "team" ? "Team" : "Einzelperson";
        if ($("pTeam")) $("pTeam").textContent = company.teamSize || 1;
        if ($("pTeamSize")) $("pTeamSize").textContent = company.teamSize || 1;
        if ($("pPrice")) $("pPrice").textContent = company.price || "-";
        if ($("pRating")) $("pRating").textContent = company.rating ?? "0";
        if ($("pExperience")) $("pExperience").textContent = company.experience || "—";
        if ($("pAvailability")) $("pAvailability").textContent = company.availability || "—";
        if ($("pPhone")) $("pPhone").textContent = company.phone || "-";
        if ($("pLang")) $("pLang").textContent = (company.languages || []).join(", ");

        if ($("pCall")) $("pCall").href = company.phone ? `tel:${company.phone}` : "#";
        if ($("pImage")) $("pImage").src = company.image || "https://via.placeholder.com/400x400?text=ReinWerk";

        const ul = $("pServices");
        if (ul) {
            ul.innerHTML = "";
            (company.services || []).forEach((s) => {
                const li = document.createElement("li");
                li.textContent = s;
                ul.appendChild(li);
            });
        }

        // ===== BOOKING =====
        const form = $("bookingForm");
        const msg = $("bookingMsg");

        if (form && msg) {
            form.addEventListener("submit", async (e) => {
                e.preventDefault();

                const payload = {
                    companyId: Number(company.id),
                    customerName: $("bName")?.value?.trim() || "",
                    customerPhone: $("bPhone")?.value?.trim() || "",
                    customerEmail: $("bEmail")?.value?.trim() || "",
                    service: $("bService")?.value?.trim() || "",
                    bookingDate: $("bDate")?.value || "",
                    bookingTime: $("bTime")?.value || "",
                    message: [
                        $("bAddress")?.value?.trim() || "",
                        $("bNote")?.value?.trim() || ""
                    ].filter(Boolean).join(" | ")
                };

                try {
                    const bookingRes = await fetch(`${API_BASE}/api/bookings`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(payload)
                    });

                    const data = await bookingRes.json().catch(() => ({}));

                    if (!bookingRes.ok) {
                        msg.textContent = "❌ " + (data.message || "حدث خطأ أثناء إرسال الحجز");
                        return;
                    }

                    msg.textContent = "✅ تم إرسال طلب الحجز بنجاح";
                    form.reset();
                } catch (err) {
                    msg.textContent = "❌ حدث خطأ أثناء إرسال الحجز";
                    console.error(err);
                }
            });
        }

    } catch (e) {
        if ($("pName")) $("pName").textContent = "Firma nicht gefunden";
        if ($("pAbout")) $("pAbout").textContent = "Bitte zurück zur Liste.";
        console.error(e);
    }
}

function setLang(lang){

    localStorage.setItem("lang",lang);
    
    if(lang==="ar"){
    document.documentElement.dir="rtl";
    }else{
    document.documentElement.dir="ltr";
    }
    
    location.reload();
    }
    
    document.addEventListener("DOMContentLoaded",()=>{
    
    const lang=localStorage.getItem("lang");
    
    if(lang==="ar"){
    document.documentElement.dir="rtl";
    }
    
    });

// ===== START =====
document.addEventListener("DOMContentLoaded", () => {
    loadNavbarProfile();
    loadCompanies();
    initProfile();
});