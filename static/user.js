// Elements
const authModal = document.getElementById("auth-modal");
const signInView = document.getElementById("signin-view");
const signUpView = document.getElementById("signup-view");

// 1. Show Popup when clicking "登入/註冊"
const authBtn = document.getElementById("auth-btn");
authBtn.addEventListener("click", () => {
  authModal.style.display = "block";
  showSignIn(); // Default to sign-in view
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
