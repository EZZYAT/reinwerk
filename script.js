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