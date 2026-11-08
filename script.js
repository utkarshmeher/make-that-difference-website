document.getElementById("year").textContent = new Date().getFullYear();
const menu = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");
menu?.addEventListener("click", () => { const open = nav.classList.toggle("open"); menu.setAttribute("aria-expanded", String(open)); });
document.querySelectorAll("[data-booking]").forEach(link => {
  link.setAttribute("href", "booking.html");
  link.addEventListener("click", event => {
    event.preventDefault();
    window.location.href = "booking.html";
  });
});
