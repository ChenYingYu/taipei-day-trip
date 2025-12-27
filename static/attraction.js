const timeRadios = document.querySelectorAll('input[name="time"]');
const priceDisplay = document.getElementById("booking-price");

timeRadios.forEach(radio => {
  radio.addEventListener("change", (e) => {
    if (e.target.value === "morning") {
      priceDisplay.textContent = "新台幣 2000 元";
    } else if (e.target.value === "afternoon") {
      priceDisplay.textContent = "新台幣 2500 元";
    }
  });
});