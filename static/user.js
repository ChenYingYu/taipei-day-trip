// Elements
const authModal = document.getElementById("auth-modal");
const signInView = document.getElementById("signin-view");
const signUpView = document.getElementById("signup-view");

// 1. Show Popup when clicking "登入/註冊"
const authBtn = document.getElementById("auth-btn");
authBtn.addEventListener("click", () => {
  // Check if the button currently says "登出系統"
  if (authBtn.textContent === "登出系統") {
    handleLogout();
  } else {
    // Only show the modal if the user is NOT logged in
    authModal.style.display = "block";
    document.body.style.overflow = "hidden";
    showSignIn();
  }
});

// 2. Hide Popup when clicking the Close Button
const closeBtn = document.getElementById("close-modal");
closeBtn.addEventListener("click", () => {
  authModal.style.display = "none";
});

// 3. Hide Popup when clicking outside the content area
window.addEventListener("click", (event) => {
  if (event.target === authModal) {
    authModal.style.display = "none";
  }
});

// 4. Switching Logic
const toSignUpLink = document.getElementById("to-signup");
const toSignInLink = document.getElementById("to-signin");

function showSignUp() {
  signInView.style.display = "none";
  signUpView.style.display = "block";
  // Clear any previous error messages
  document.getElementById("signin-error").textContent = "";
}

function showSignIn() {
  signUpView.style.display = "none";
  signInView.style.display = "block";
  // Clear any previous error messages
  document.getElementById("signup-error").textContent = "";
}

toSignUpLink.addEventListener("click", showSignUp);
toSignInLink.addEventListener("click", showSignIn);

const signupBtn = document.getElementById("signup-btn");

signupBtn.addEventListener("click", async () => {
  const name = document.getElementById("signup-name").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value.trim();
  const errorMsg = document.getElementById("signup-error");
  const successMsg = document.getElementById("signup-success");

  // Clear previous messages
  errorMsg.textContent = "";
  successMsg.textContent = "";

  if (!name || !email || !password) {
    errorMsg.textContent = "請輸入完整姓名、信箱與密碼";
    setTimeout(() => {
      errorMsg.textContent = "";
    }, 2000);
    return; // Stop the function here
  }

  try {
    const response = await fetch("/api/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const result = await response.json();

    if (response.ok && result.ok) {
      successMsg.textContent = "註冊成功，請登入系統";
      setTimeout(() => {
        successMsg.textContent = "";
        showSignIn(); // Switch to sign-in view
      }, 2000);
    } else {
      errorMsg.textContent = result.message || "註冊失敗";
      setTimeout(() => {
        errorMsg.textContent = "";
      }, 2000);
    }
  } catch (error) {
    errorMsg.textContent = "伺服器錯誤，請稍後再試";
  }
});

const signinBtn = document.getElementById("signin-btn");

signinBtn.addEventListener("click", async () => {
  const email = document.getElementById("signin-email").value.trim();
  const password = document.getElementById("signin-password").value.trim();
  const errorMsg = document.getElementById("signin-error");

  errorMsg.textContent = "";

  if (!email || !password) {
    errorMsg.textContent = "請輸入信箱與密碼";
    setTimeout(() => {
      errorMsg.textContent = "";
    }, 2000);
    return; // Stop the function here
  }

  try {
    const response = await fetch("/api/user/auth", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();

    if (response.ok && result.token) {
      // 1. Save token to localStorage
      localStorage.setItem("token", result.token);

      // 2. Close modal
      authModal.style.display = "none";
      document.body.style.overflow = "auto";

      // 3. Refresh page to update the UI (or call a function to update the header)
      location.reload();
    } else {
      errorMsg.textContent = result.message || "電子郵件或密碼錯誤";
      setTimeout(() => {
        errorMsg.textContent = "";
      }, 2000);
    }
  } catch (error) {
    errorMsg.textContent = "伺服器錯誤，請稍後再試";
  }
});

async function checkLoginStatus() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const response = await fetch("/api/user/auth", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const result = await response.json();

    if (result.data) {
      // User is logged in!
      authBtn.textContent = "登出系統";

      // Add a new click listener for logging out
      authBtn.onclick = handleLogout;
    } else {
      // INVALID/GHOST TOKEN FOUND:
      localStorage.removeItem("token");

      // Ensure the button stays as "登入/註冊"
      authBtn.textContent = "登入/註冊";
    }
  } catch (error) {
    console.error("Auth check failed:", error);
  }
}

function handleLogout() {
  localStorage.removeItem("token");
  location.reload();
}

const navBookingBtn = document.getElementById("nav-booking-btn");

navBookingBtn.addEventListener("click", (e) => {
  e.preventDefault(); // Prevent default link behavior
  const token = localStorage.getItem("token");
  if (token) {
    // User is logged in, send to booking page
    window.location.href = "/booking";
  } else {
    // User not logged in, trigger existing login modal
    authModal.style.display = "block";
    document.body.style.overflow = "hidden";
    showSignIn();
  }
});

// Run this immediately when the script loads
document.addEventListener("DOMContentLoaded", checkLoginStatus);
