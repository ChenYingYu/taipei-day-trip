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
