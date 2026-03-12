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
        navToggle.addEventListener("click", () => navLinks.classList.toggle("open"));
        navLinks.querySelectorAll("a").forEach((a) => {
            a.addEventListener("click", () => navLinks.classList.remove("open"));
        });
    }
})();

// ===== COUNTDOWN =====
(function initCountdown() {
    const daysEl = document.getElementById("days");
    if (!daysEl) return;

    const endDate = new Date("2026-05-08T23:59:59").getTime();

    function updateCountdown() {
        const now = Date.now();
        const diff = endDate - now;

        if (diff <= 0) {
            daysEl.textContent = "0";
            return;
        }

        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        daysEl.textContent = String(days);
    }

    updateCountdown();
    setInterval(updateCountdown, 1000 * 60);
})();

// ===== INDEX: RENDER COMPANIES =====
function renderCompanies(list) {
    const container = $("companies");
    if (!container) return;

    container.innerHTML = "";

    list.forEach((company) => {
        const card = document.createElement("div");
        card.className = "company-card";

        card.innerHTML = `
      <div class="company-info">
        <h3>${company.name}</h3>

        <div class="company-meta">
          <div>📍 ${company.district}</div>
          <div>⭐ ${company.rating}</div>
          <div class="company-price">${company.price}</div>
        </div>

        <div class="company-actions">
          <a class="btn btn-primary" href="profile.html?id=${company.id}">Profil</a>
          <a class="btn" href="tel:${company.phone}">Anrufen</a>
        </div>
      </div>

      <img class="company-thumb" src="${company.image}" alt="${company.name}">
    `;

        container.appendChild(card);
    });
}

// ===== LOAD COMPANIES =====
async function loadCompanies() {
    try {
        const res = await fetch(`${API_BASE}/api/companies`);
        const data = await res.json();

        companies = Array.isArray(data) ? data : [];

        renderCompanies(companies);
        initSearch();
        initProfile();
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
        $("pName").textContent = "Firma nicht gefunden";
        $("pAbout").textContent = "Bitte zurück zur Liste.";
        return;
    }

    try {
        const res = await fetch(`/api/companies/${id}`);
        if (!res.ok) throw new Error("Company not found");

        const company = await res.json();

        if ($("pName")) $("pName").textContent = company.name;
        if ($("pAbout")) $("pAbout").textContent = company.description;
        if ($("pDistrict")) $("pDistrict").textContent = company.district;
        if ($("pType")) $("pType").textContent = company.type === "team" ? "Team" : "Einzelperson";
        if ($("pTeam")) $("pTeam").textContent = `Teamgröße: ${company.teamSize || 1}`;
        if ($("pTeamSize")) $("pTeamSize").textContent = company.teamSize || 1;
        if ($("pPrice")) $("pPrice").textContent = company.price;
        if ($("pRating")) $("pRating").textContent = company.rating;
        if ($("pExperience")) $("pExperience").textContent = company.experience || "—";
        if ($("pAvailability")) $("pAvailability").textContent = company.availability || "—";
        if ($("pPhone")) $("pPhone").textContent = company.phone;
        if ($("pLang")) $("pLang").textContent = (company.languages || []).join(", ");

        if ($("pCall")) $("pCall").href = `tel:${company.phone}`;
        if ($("pImage")) $("pImage").src = company.image;

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

// ===== START =====
loadCompanies();