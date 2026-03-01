// ===== DATA =====
const companies = [
    {
        id: 1,
        name: "Muster Clean Köln",
        district: "Ehrenfeld",
        price: "ab 89€",
        rating: 4.8,
        phone: "+49 221 111111",
        image: "images/team1.jpg",
        type: "team",
        teamSize: 4,
        description: "Reinigungsservice für Wohnungen und Büros in Köln.",
        services: ["Wohnung", "Büro", "Fenster", "Grundreinigung"],
        languages: ["DE", "AR", "EN"],
        experience: "3+ Jahre",
        availability: "Mo-Fr 10:00–16:00"
    },
    {
        id: 2,
        name: "RheinRein Service",
        district: "Deutz",
        price: "ab 79€",
        rating: 4.6,
        phone: "+49 221 222222",
        image: "images/team2.jpg",
        type: "team",
        teamSize: 6,
        description: "Professionelle Reinigung für Firmen und Hotels.",
        services: ["Hotel", "Büro", "Praxis", "Teppich"],
        languages: ["DE", "EN"],
        experience: "5+ Jahre",
        availability: "Mo-So 08:00–19:00"
    },
    {
        id: 3,
        name: "SauberPro Köln",
        district: "Nippes",
        price: "ab 99€",
        rating: 4.9,
        phone: "+49 221 333333",
        image: "images/team3.jpg",
        type: "person",
        teamSize: 1,
        description: "Einzelperson für Haushaltsreinigung und kleine Wohnungen.",
        services: ["Wohnung", "Haushaltshilfe", "Fenster"],
        languages: ["DE", "AR"],
        experience: "2+ Jahre",
        availability: "Mo-Fr 09:00–14:00"
    }
];

// ===== HELPERS =====
function $(id) { return document.getElementById(id); }

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
        navLinks.querySelectorAll("a").forEach(a => {
            a.addEventListener("click", () => navLinks.classList.remove("open"));
        });
    }
})();

// ===== COUNTDOWN =====
(function initCountdown() {
    const d = $("days"), h = $("hours"), m = $("minutes"), s = $("seconds");
    if (!d || !h || !m || !s) return;

    // target date (change if you want)
    const target = new Date();
    target.setDate(target.getDate() + 92);

    function pad(n) { return String(n).padStart(2, "0"); }

    function tick() {
        const now = new Date();
        const diff = target - now;
        if (diff <= 0) {
            d.textContent = "00"; h.textContent = "00"; m.textContent = "00"; s.textContent = "00";
            return;
        }
        const totalSec = Math.floor(diff / 1000);
        const days = Math.floor(totalSec / (3600 * 24));
        const hours = Math.floor((totalSec % (3600 * 24)) / 3600);
        const mins = Math.floor((totalSec % 3600) / 60);
        const secs = totalSec % 60;

        d.textContent = pad(days);
        h.textContent = pad(hours);
        m.textContent = pad(mins);
        s.textContent = pad(secs);
    }

    tick();
    setInterval(tick, 1000);
})();

// ===== INDEX: RENDER CARDS + SEARCH =====
(function initIndex() {
    const container = $("companies");
    const searchInput = $("search");
    if (!container || !searchInput) return;

    function render(list) {
        container.innerHTML = "";

        list.forEach(company => {
            const card = document.createElement("div");
            card.className = "card";
            card.style.cursor = "pointer";

            // click on card opens profile
            card.addEventListener("click", () => {
                window.location.href = `profile.html?id=${company.id}`;
            });

            card.innerHTML = `
          <div class="card-content">
            <div class="card-text">
              <h3>${company.name}</h3>
              <p>📍 ${company.district}</p>
              <p>⭐ ${company.rating}</p>
              <p><strong>${company.price}</strong></p>
  
              <div class="card-actions">
                <a class="btn" href="profile.html?id=${company.id}" onclick="event.stopPropagation()">Profil</a>
                <a class="btn" href="tel:${company.phone}" onclick="event.stopPropagation()">Anrufen</a>
              </div>
            </div>
  
            <div class="card-image">
              <img src="${company.image}" alt="Team" />
            </div>
          </div>
        `;

            container.appendChild(card);
        });
    }

    render(companies);

    searchInput.addEventListener("input", () => {
        const v = searchInput.value.toLowerCase().trim();
        const filtered = companies.filter(c =>
            c.name.toLowerCase().includes(v) ||
            c.district.toLowerCase().includes(v)
        );
        render(filtered);
    });
})();

// ===== PROFILE: FILL DATA + BOOKING =====
(function initProfile() {
    const profileBox = $("profileBox");
    if (!profileBox) return;

    const params = new URLSearchParams(window.location.search);
    const id = Number(params.get("id"));
    const company = companies.find(c => c.id === id);

    if (!company) {
        $("pName").textContent = "Firma nicht gefunden";
        $("pAbout").textContent = "Bitte zurück zur Liste.";
        return;
    }

    $("pName").textContent = company.name;
    $("pAbout").textContent = company.description;

    $("pDistrict").textContent = company.district;
    $("pType").textContent = (company.type === "team") ? "Team" : "Einzelperson";
    $("pTeam").textContent = `Teamgröße: ${company.teamSize || 1}`;
    $("pPrice").textContent = company.price;
    $("pRating").textContent = company.rating;

    $("pExperience").textContent = company.experience || "—";
    $("pAvailability").textContent = company.availability || "—";
    $("pPhone").textContent = company.phone;

    const call = $("pCall");
    call.href = `tel:${company.phone}`;

    const img = $("pImage");
    img.src = company.image;

    const ul = $("pServices");
    ul.innerHTML = "";
    (company.services || []).forEach(s => {
        const li = document.createElement("li");
        li.textContent = s;
        ul.appendChild(li);
    });

    $("pLang").textContent = (company.languages || []).join(", ");

    // Booking form (demo)
    const form = $("bookingForm");
    const msg = $("bookingMsg");

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        msg.textContent = "✅ Anfrage gesendet (Demo). Wir melden uns bald!";
        form.reset();
    });
})();