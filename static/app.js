let nextPage = 0;
let isLoading = false;
let currentKeyword = "";
let currentCategory = "";

async function getAttractions() {
  if (nextPage === null || isLoading) return;
  isLoading = true;
  try {
    let url = `/api/attractions?page=${nextPage}`;
    if (currentCategory)
      url += `&category=${encodeURIComponent(currentCategory)}`;
    if (currentKeyword) url += `&keyword=${encodeURIComponent(currentKeyword)}`;
    const response = await fetch(url);
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

  if (nextPage === 0 && attractions.length === 0) {
    grid.innerHTML = '<div class="no-results">沒有找到相關景點</div>';
    nextPage = null;
    return;
  }

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

const searchBtn = document.getElementById("search-btn");
const searchInput = document.getElementById("search_input");

searchBtn.addEventListener("click", () => {
  currentKeyword = searchInput.value.trim();

  nextPage = 0;
  document.getElementById("attractions-grid").innerHTML = "";

  getAttractions();
});

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
        currentCategory = category === "全部分類" ? "" : category;
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

const mrtContainer = document.getElementById("mrt-container");
const leftBtn = document.getElementById("mrt-scroll-left");
const rightBtn = document.getElementById("mrt-scroll-right");

leftBtn.addEventListener("click", () => {
  mrtContainer.scrollBy({
    left: -mrtContainer.offsetWidth + 50,
    behavior: "smooth",
  });
});

rightBtn.addEventListener("click", () => {
  mrtContainer.scrollBy({
    left: mrtContainer.offsetWidth - 50,
    behavior: "smooth",
  });
});

async function initMrtList() {
  try {
    const response = await fetch("/api/mrts");
    const result = await response.json();
    const mrts = result.data;

    const container = document.getElementById("mrt-container");
    container.innerHTML = "";
    mrts.forEach((mrt) => {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.className = "mrt_button";
      button.textContent = mrt;

      button.addEventListener("click", () => {
        searchInput.value = mrt;
        currentKeyword = mrt;

        nextPage = 0;
        document.getElementById("attractions-grid").innerHTML = "";
        getAttractions();
      });

      li.appendChild(button);
      container.appendChild(li);
    });
  } catch (error) {
    console.error("Error fetching MRTs:", error);
  }
}

initCategories();
initMrtList();
