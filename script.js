const companies = [
    {
        name: "Muster Clean Köln",
        district: "Ehrenfeld",
        price: "ab 89€",
        rating: 4.8,
        phone: "+49 221 111111"
    },
    {
        name: "RheinRein Service",
        district: "Deutz",
        price: "ab 79€",
        rating: 4.6,
        phone: "+49 221 222222"
    },
    {
        name: "SauberPro Köln",
        district: "Nippes",
        price: "ab 99€",
        rating: 4.9,
        phone: "+49 221 333333"
    }
];

const container = document.getElementById("companies");
const searchInput = document.getElementById("search");

function renderCompanies(list) {
    container.innerHTML = "";

    list.forEach(function (company) {
        const card = document.createElement("div");
        card.className = "card";

        card.innerHTML =
            "<h3>" + company.name + "</h3>" +
            "<p>📍 " + company.district + "</p>" +
            "<p>⭐ " + company.rating + "</p>" +
            "<p><strong>" + company.price + "</strong></p>" +
            "<button onclick=\"window.location.href='tel:" + company.phone + "'\">Jetzt kontaktieren</button>";

        container.appendChild(card);
    });
}

searchInput.addEventListener("input", function () {
    const value = searchInput.value.toLowerCase();

    const filtered = companies.filter(function (c) {
        return c.name.toLowerCase().includes(value) ||
            c.district.toLowerCase().includes(value);
    });

    renderCompanies(filtered);
});

renderCompanies(companies);
const example = [
    { key: "value" },
    { key: "value" }
];
const closeBtn = document.getElementById("closeBanner");
const betaBanner = document.getElementById("betaBanner");

if (closeBtn && betaBanner) {
    const hidden = localStorage.getItem("reinwerk_beta_banner_hidden");
    if (hidden === "1") betaBanner.style.display = "none";

    closeBtn.addEventListener("click", function () {
        betaBanner.style.display = "none";
        localStorage.setItem("reinwerk_beta_banner_hidden", "1");
    });
}
function revealCards() {
    const cards = document.querySelectorAll(".card");
    const trigger = window.innerHeight * 0.85;

    cards.forEach(card => {
        const top = card.getBoundingClientRect().top;
        if (top < trigger) {
            card.classList.add("show");
        }
    });
}

window.addEventListener("scroll", revealCards);
window.addEventListener("load", revealCards);
// Set launch date (3 months from now)
const launchDate = new Date();
launchDate.setMonth(launchDate.getMonth() + 3);

function updateCountdown() {
    const now = new Date().getTime();
    const distance = launchDate - now;

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    document.getElementById("days").innerText = days;
    document.getElementById("hours").innerText = hours;
    document.getElementById("minutes").innerText = minutes;
    document.getElementById("seconds").innerText = seconds;
}

setInterval(updateCountdown, 1000);
updateCountdown();