let nextPage = 0;
let isLoading = false;

async function getAttractions() {
  if (nextPage === null || isLoading) return;
  isLoading = true;
  try {
    const response = await fetch(`/api/attractions?page=${nextPage}`);
    const data = await response.json();
    renderAttractions(data.data);
    nextPage = data.nextPage;
    isLoading = false;

    if (
      document.documentElement.scrollHeight <= window.innerHeight &&
      nextPage !== null
    ) {
      getAttractions();
    }
  } catch (error) {
    console.error("Error fetching attractions:", error);
  }
}

function renderAttractions(attractions) {
  const grid = document.getElementById("attractions-grid");

  attractions.forEach((attraction) => {
    const card = document.createElement("div");
    card.className = "attraction-card";

    const imageUrl = attraction.images[0];

    card.innerHTML = `
            <div class="attraction-card__thumbnail" style="background-image: url('${imageUrl}')">
                <div class="attraction-card__name"></div>
            </div>
            <div class="attraction-card__info">
                <div class="attraction-card__mrt"></div>
                <div class="attraction-card__category"></div>
            </div>
        `;

    card.querySelector(".attraction-card__name").textContent = attraction.name;
    card.querySelector(".attraction-card__mrt").textContent =
      attraction.mrt || "";
    card.querySelector(".attraction-card__category").textContent =
      attraction.category;

    grid.appendChild(card);
  });
}

const observerOptions = {
  root: null,
  rootMargin: "0px",
  threshold: 0.1,
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      getAttractions();
    }
  });
}, observerOptions);

const sentinel = document.getElementById("infinite-scroll-sentinel");
observer.observe(sentinel);

// Category Dropdown Logic
const categoryBtn = document.getElementById("category-btn");
const categoryMenu = document.getElementById("category-menu");

async function initCategories() {
  try {
    const response = await fetch("/api/categories");
    const result = await response.json();
    const categories = result.data;

    categories.unshift("全部分類");

    categoryMenu.innerHTML = ""; 
    categories.forEach((category) => {
      const item = document.createElement("div");
      item.className = "category-item";
      item.textContent = category;

      item.addEventListener("click", () => {
        categoryBtn.textContent = category + " ▼";
        categoryMenu.classList.remove("active");
      });

      categoryMenu.appendChild(item);
    });
    console.log;
  } catch (error) {
    console.error("Error fetching categories:", error);
  }
}

categoryBtn.addEventListener("click", (e) => {
  categoryMenu.classList.toggle("active");
  e.stopPropagation();
});

document.addEventListener("click", () => {
  categoryMenu.classList.remove("active");
});

categoryMenu.addEventListener("click", (e) => {
  e.stopPropagation();
});

initCategories();
