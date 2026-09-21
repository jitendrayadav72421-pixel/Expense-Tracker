/*
 * Expense Tracker
 * Multi-user version:
 * Netlify Identity + Netlify Function + Netlify Blobs
 */

import {
  getUser,
  login,
  signup,
  logout,
  onAuthChange,
  handleAuthCallback,
} from "https://esm.sh/@netlify/identity@2.0.0";

const CATEGORIES = [
  "Food",
  "Travel",
  "Shopping",
  "Bills",
  "Entertainment",
  "Education",
  "Healthcare",
  "Other",
];

let expenses = [];
let toastTimeout;
let currentUser = null;

const elements = {
  form: document.querySelector("#expense-form"),
  titleInput: document.querySelector("#expense-title"),
  amountInput: document.querySelector("#expense-amount"),
  categoryInput: document.querySelector("#expense-category"),
  dateInput: document.querySelector("#expense-date"),

  titleError: document.querySelector("#title-error"),
  amountError: document.querySelector("#amount-error"),
  categoryError: document.querySelector("#category-error"),
  dateError: document.querySelector("#date-error"),

  totalExpenses: document.querySelector("#total-expenses"),
  expenseCount: document.querySelector("#expense-count"),
  highestExpense: document.querySelector("#highest-expense"),
  highestExpenseDetail: document.querySelector("#highest-expense-detail"),

  categoryList: document.querySelector("#category-list"),

  searchInput: document.querySelector("#search-input"),
  filterCategory: document.querySelector("#filter-category"),
  sortExpenses: document.querySelector("#sort-expenses"),

  tableBody: document.querySelector("#expense-table-body"),

  emptyState: document.querySelector("#empty-state"),
  emptyStateTitle: document.querySelector("#empty-state-title"),
  emptyStateCopy: document.querySelector("#empty-state-copy"),

  clearFilters: document.querySelector("#clear-filters"),
  resultCount: document.querySelector("#result-count"),

  todayDate: document.querySelector("#today-date"),
  toast: document.querySelector("#toast"),
};

/* =========================================================
   BASIC HELPERS
========================================================= */

function formatIndianRupees(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function getTodayString() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  if (!dateString) return "—";

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getCategorySlug(category) {
  return category.toLowerCase().replace(/\s+/g, "-");
}

/* =========================================================
   AUTH UI
========================================================= */

function createAuthUI() {
  const header = document.querySelector(".topbar");
  const main = document.querySelector("main");

  if (!header || !main) return;

  const authBar = document.createElement("div");

  authBar.id = "auth-bar";

  authBar.style.cssText = `
    display:flex;
    align-items:center;
    justify-content:flex-end;
    gap:10px;
    padding:12px 20px;
    border-bottom:1px solid #e5e7eb;
    background:#ffffff;
    flex-wrap:wrap;
  `;

  authBar.innerHTML = `
    <span id="user-info"
      style="font-size:14px;color:#4b5563;"></span>

    <button id="login-btn"
      type="button"
      style="
        border:0;
        padding:9px 15px;
        border-radius:8px;
        cursor:pointer;
        background:#2563eb;
        color:white;
        font-weight:600;
      ">
      Login
    </button>

    <button id="signup-btn"
      type="button"
      style="
        border:1px solid #2563eb;
        padding:8px 15px;
        border-radius:8px;
        cursor:pointer;
        background:white;
        color:#2563eb;
        font-weight:600;
      ">
      Create Account
    </button>

    <button id="logout-btn"
      type="button"
      hidden
      style="
        border:0;
        padding:9px 15px;
        border-radius:8px;
        cursor:pointer;
        background:#dc2626;
        color:white;
        font-weight:600;
      ">
      Logout
    </button>
  `;

  header.insertAdjacentElement("afterend", authBar);

  main.hidden = true;

  document
    .querySelector("#login-btn")
    .addEventListener("click", () => openAuthModal("login"));

  document
    .querySelector("#signup-btn")
    .addEventListener("click", () => openAuthModal("signup"));

  document
    .querySelector("#logout-btn")
    .addEventListener("click", handleLogout);
}

/* =========================================================
   AUTH MODAL
========================================================= */

function openAuthModal(mode) {
  const oldModal = document.querySelector("#auth-modal");

  if (oldModal) {
    oldModal.remove();
  }

  const isSignup = mode === "signup";

  const modal = document.createElement("div");

  modal.id = "auth-modal";

  modal.style.cssText = `
    position:fixed;
    inset:0;
    background:rgba(0,0,0,.55);
    display:flex;
    align-items:center;
    justify-content:center;
    z-index:9999;
    padding:20px;
  `;

  modal.innerHTML = `
    <div
      style="
        width:min(420px,100%);
        background:white;
        border-radius:16px;
        padding:28px;
        box-shadow:0 20px 60px rgba(0,0,0,.25);
      "
    >

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:20px;
      ">
        <h2 style="margin:0;">
          ${isSignup ? "Create Account" : "Login"}
        </h2>

        <button
          id="close-auth"
          type="button"
          style="
            border:0;
            background:none;
            font-size:24px;
            cursor:pointer;
          "
        >
          ×
        </button>
      </div>

      ${
        isSignup
          ? `
            <label style="display:block;margin-bottom:6px;">
              Name
            </label>

            <input
              id="auth-name"
              type="text"
              placeholder="Your name"
              required
              style="
                width:100%;
                box-sizing:border-box;
                padding:12px;
                margin-bottom:15px;
                border:1px solid #d1d5db;
                border-radius:8px;
              "
            />
          `
          : ""
      }

      <label style="display:block;margin-bottom:6px;">
        Email
      </label>

      <input
        id="auth-email"
        type="email"
        placeholder="you@example.com"
        required
        style="
          width:100%;
          box-sizing:border-box;
          padding:12px;
          margin-bottom:15px;
          border:1px solid #d1d5db;
          border-radius:8px;
        "
      />

      <label style="display:block;margin-bottom:6px;">
        Password
      </label>

      <input
        id="auth-password"
        type="password"
        placeholder="Password"
        required
        minlength="6"
        style="
          width:100%;
          box-sizing:border-box;
          padding:12px;
          margin-bottom:15px;
          border:1px solid #d1d5db;
          border-radius:8px;
        "
      />

      <p
        id="auth-error"
        style="
          color:#dc2626;
          font-size:14px;
          min-height:20px;
        "
      ></p>

      <button
        id="auth-submit"
        type="button"
        style="
          width:100%;
          border:0;
          padding:12px;
          border-radius:8px;
          background:#2563eb;
          color:white;
          font-weight:700;
          cursor:pointer;
        "
      >
        ${isSignup ? "Create Account" : "Login"}
      </button>

      <p style="
        text-align:center;
        margin-top:18px;
        font-size:14px;
        color:#6b7280;
      ">
        ${
          isSignup
            ? `Already have an account?
               <button id="switch-auth"
                 type="button"
                 style="border:0;background:none;color:#2563eb;cursor:pointer;">
                 Login
               </button>`
            : `Don't have an account?
               <button id="switch-auth"
                 type="button"
                 style="border:0;background:none;color:#2563eb;cursor:pointer;">
                 Create Account
               </button>`
        }
      </p>

    </div>
  `;

  document.body.appendChild(modal);

  document
    .querySelector("#close-auth")
    .addEventListener("click", () => modal.remove());

  document
    .querySelector("#switch-auth")
    .addEventListener("click", () => {
      modal.remove();
      openAuthModal(isSignup ? "login" : "signup");
    });

  document
    .querySelector("#auth-submit")
    .addEventListener("click", () => handleAuth(mode));

  document
    .querySelector("#auth-password")
    .addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        handleAuth(mode);
      }
    });
}

/* =========================================================
   LOGIN / SIGNUP
========================================================= */

async function handleAuth(mode) {
  const email = document
    .querySelector("#auth-email")
    .value
    .trim();

  const password = document
    .querySelector("#auth-password")
    .value;

  const errorElement = document.querySelector("#auth-error");

  if (!email || !password) {
    errorElement.textContent = "Email and password are required.";
    return;
  }

  if (password.length < 6) {
    errorElement.textContent =
      "Password must contain at least 6 characters.";
    return;
  }

  try {
    const button = document.querySelector("#auth-submit");

    button.disabled = true;
    button.textContent = "Please wait...";

    if (mode === "signup") {
      const name = document
        .querySelector("#auth-name")
        .value
        .trim();

      if (!name) {
        throw new Error("Please enter your name.");
      }

      await signup(email, password, {
        full_name: name,
      });

      errorElement.style.color = "#16a34a";
      errorElement.textContent =
        "Account created. Check your email and confirm your account.";

      button.textContent = "Check Your Email";
    } else {
      await login(email, password);

      document
        .querySelector("#auth-modal")
        ?.remove();
    }
  } catch (error) {
    console.error(error);

    errorElement.style.color = "#dc2626";

    errorElement.textContent =
      error?.message || "Authentication failed.";

    const button = document.querySelector("#auth-submit");

    if (button) {
      button.disabled = false;
      button.textContent =
        mode === "signup"
          ? "Create Account"
          : "Login";
    }
  }
}

async function handleLogout() {
  try {
    await logout();

    expenses = [];

    renderApp();

    showToast("Logged out successfully.");
  } catch (error) {
    console.error(error);
    showToast("Logout failed.");
  }
}

/* =========================================================
   AUTH STATE
========================================================= */

async function updateAuthUI(user) {
  currentUser = user;

  const main = document.querySelector("main");

  const loginButton = document.querySelector("#login-btn");
  const signupButton = document.querySelector("#signup-btn");
  const logoutButton = document.querySelector("#logout-btn");
  const userInfo = document.querySelector("#user-info");

  if (!user) {
    if (main) {
      main.hidden = true;
    }

    loginButton.hidden = false;
    signupButton.hidden = false;
    logoutButton.hidden = true;

    userInfo.textContent = "";

    expenses = [];

    return;
  }

  if (main) {
    main.hidden = false;
  }

  loginButton.hidden = true;
  signupButton.hidden = true;
  logoutButton.hidden = false;

  userInfo.textContent = `Logged in as ${user.email}`;

  await loadUserExpenses();

  renderApp();
}

/* =========================================================
   SERVER DATA
========================================================= */

async function loadUserExpenses() {
  try {
    const response = await fetch(
      "/.netlify/functions/expenses",
      {
        method: "GET",
        credentials: "same-origin",
      },
    );

    if (response.status === 401) {
      throw new Error("You are not logged in.");
    }

    if (!response.ok) {
      throw new Error("Could not load your expenses.");
    }

    const data = await response.json();

    expenses = Array.isArray(data.expenses)
      ? data.expenses
      : [];
  } catch (error) {
    console.error(error);

    expenses = [];

    showToast("Could not load expenses.");
  }
}

async function saveExpenses() {
  if (!currentUser) {
    showToast("Please login first.");
    return false;
  }

  try {
    const response = await fetch(
      "/.netlify/functions/expenses",
      {
        method: "PUT",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          expenses,
        }),
      },
    );

    if (response.status === 401) {
      throw new Error("Your session has expired.");
    }

    if (!response.ok) {
      throw new Error("Could not save expenses.");
    }

    return true;
  } catch (error) {
    console.error(error);

    showToast(error.message || "Could not save expenses.");

    return false;
  }
}

/* =========================================================
   EXPENSE CALCULATIONS
========================================================= */

function getCategoryTotals() {
  const totals = Object.fromEntries(
    CATEGORIES.map((category) => [category, 0]),
  );

  expenses.forEach((expense) => {
    if (totals[expense.category] !== undefined) {
      totals[expense.category] += Number(expense.amount);
    }
  });

  return totals;
}

function getVisibleExpenses() {
  const searchTerm =
    elements.searchInput.value.trim().toLowerCase();

  const selectedCategory =
    elements.filterCategory.value;

  const selectedSort =
    elements.sortExpenses.value;

  const visibleExpenses = expenses.filter((expense) => {
    const titleMatches =
      expense.title.toLowerCase().includes(searchTerm);

    const categoryMatches =
      selectedCategory === "all" ||
      expense.category === selectedCategory;

    return titleMatches && categoryMatches;
  });

  return visibleExpenses.sort((first, second) => {
    if (selectedSort === "oldest") {
      return first.date.localeCompare(second.date);
    }

    if (selectedSort === "highest") {
      return Number(second.amount) - Number(first.amount);
    }

    if (selectedSort === "lowest") {
      return Number(first.amount) - Number(second.amount);
    }

    return second.date.localeCompare(first.date);
  });
}

/* =========================================================
   SUMMARY
========================================================= */

function updateSummary() {
  const total = expenses.reduce(
    (sum, expense) =>
      sum + Number(expense.amount),
    0,
  );

  const highest = expenses.reduce(
    (currentHighest, expense) =>
      Number(expense.amount) >
      Number(currentHighest.amount || 0)
        ? expense
        : currentHighest,
    {},
  );

  elements.totalExpenses.textContent =
    formatIndianRupees(total);

  elements.expenseCount.textContent =
    String(expenses.length);

  elements.highestExpense.textContent =
    formatIndianRupees(highest.amount || 0);

  elements.highestExpenseDetail.textContent =
    highest.title || "No expense yet";
}

/* =========================================================
   CATEGORY DISPLAY
========================================================= */

function renderCategoryTotals() {
  const totals = getCategoryTotals();

  const highestCategoryTotal =
    Math.max(...Object.values(totals), 1);

  elements.categoryList.replaceChildren();

  CATEGORIES.forEach((category) => {
    const item = document.createElement("div");
    item.className = "category-item";

    const heading = document.createElement("div");
    heading.className = "category-item-heading";

    const label = document.createElement("div");
    label.className = "category-label";

    const dot = document.createElement("span");

    dot.className =
      `category-dot category-dot-${getCategorySlug(category)}`;

    dot.setAttribute("aria-hidden", "true");

    const labelText = document.createElement("span");
    labelText.textContent = category;

    label.append(dot, labelText);

    const amount = document.createElement("span");

    amount.className = "category-amount";

    amount.textContent =
      formatIndianRupees(totals[category]);

    heading.append(label, amount);

    const bar = document.createElement("div");

    bar.className = "category-bar";

    bar.setAttribute("role", "progressbar");

    bar.setAttribute(
      "aria-label",
      `${category} spending`,
    );

    bar.setAttribute("aria-valuemin", "0");

    bar.setAttribute(
      "aria-valuemax",
      String(highestCategoryTotal),
    );

    bar.setAttribute(
      "aria-valuenow",
      String(totals[category]),
    );

    const fill = document.createElement("div");

    fill.className =
      `category-bar-fill category-bar-fill-${getCategorySlug(category)}`;

    fill.style.width =
      `${(totals[category] / highestCategoryTotal) * 100}%`;

    bar.append(fill);

    item.append(heading, bar);

    elements.categoryList.append(item);
  });
}

/* =========================================================
   EXPENSE TABLE
========================================================= */

function renderExpenses() {
  const visibleExpenses =
    getVisibleExpenses();

  const hasFilters =
    elements.searchInput.value.trim() !== "" ||
    elements.filterCategory.value !== "all";

  elements.tableBody.replaceChildren();

  visibleExpenses.forEach((expense) => {
    const row = document.createElement("tr");

    const titleCell =
      document.createElement("td");

    titleCell.className =
      "expense-title-cell";

    titleCell.textContent =
      expense.title;

    const categoryCell =
      document.createElement("td");

    const categoryBadge =
      document.createElement("span");

    categoryBadge.className =
      `category-badge category-badge-${getCategorySlug(expense.category)}`;

    categoryBadge.textContent =
      expense.category;

    categoryCell.append(categoryBadge);

    const amountCell =
      document.createElement("td");

    amountCell.className =
      "expense-amount-cell";

    amountCell.textContent =
      formatIndianRupees(expense.amount);

    const dateCell =
      document.createElement("td");

    dateCell.className =
      "expense-date-cell";

    dateCell.textContent =
      formatDate(expense.date);

    const actionCell =
      document.createElement("td");

    const deleteButton =
      document.createElement("button");

    deleteButton.className =
      "delete-button";

    deleteButton.type = "button";

    deleteButton.dataset.id =
      expense.id;

    deleteButton.setAttribute(
      "aria-label",
      `Delete ${expense.title}`,
    );

    deleteButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4.5 7h15M9.5 7V4.5h5V7M7 7l.7 12.5h8.6L17 7M10 10.5v6M14 10.5v6" />
      </svg>
    `;

    actionCell.append(deleteButton);

    row.append(
      titleCell,
      categoryCell,
      amountCell,
      dateCell,
      actionCell,
    );

    elements.tableBody.append(row);
  });

  const visibleCount =
    visibleExpenses.length;

  elements.resultCount.textContent =
    `${visibleCount} ${
      visibleCount === 1
        ? "expense"
        : "expenses"
    }`;

  const showEmptyState =
    visibleCount === 0;

  elements.emptyState.hidden =
    !showEmptyState;

  if (showEmptyState) {
    elements.emptyStateTitle.textContent =
      hasFilters
        ? "No matching expenses"
        : "No expenses yet";

    elements.emptyStateCopy.textContent =
      hasFilters
        ? "Try a different search or category filter."
        : "Add your first expense to start understanding your spending.";

    elements.clearFilters.hidden =
      !hasFilters;
  }
}

/* =========================================================
   RENDER
========================================================= */

function renderApp() {
  updateSummary();
  renderCategoryTotals();
  renderExpenses();
}

/* =========================================================
   FORM VALIDATION
========================================================= */

function clearValidation() {
  const fields = [
    ["titleInput", "titleError"],
    ["amountInput", "amountError"],
    ["categoryInput", "categoryError"],
    ["dateInput", "dateError"],
  ];

  fields.forEach(
    ([inputName, errorName]) => {
      elements[inputName].classList.remove(
        "input-error",
      );

      elements[errorName].textContent = "";
    },
  );
}

function setFieldError(
  inputElement,
  errorElement,
  message,
) {
  inputElement.classList.add(
    "input-error",
  );

  errorElement.textContent =
    message;
}

function validateForm() {
  clearValidation();

  let isValid = true;

  if (!elements.titleInput.value.trim()) {
    setFieldError(
      elements.titleInput,
      elements.titleError,
      "Please enter an expense title.",
    );

    isValid = false;
  }

  const amount =
    Number(elements.amountInput.value);

  if (
    !elements.amountInput.value ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    setFieldError(
      elements.amountInput,
      elements.amountError,
      "Amount must be greater than ₹0.",
    );

    isValid = false;
  }

  if (!elements.categoryInput.value) {
    setFieldError(
      elements.categoryInput,
      elements.categoryError,
      "Please select a category.",
    );

    isValid = false;
  }

  if (!elements.dateInput.value) {
    setFieldError(
      elements.dateInput,
      elements.dateError,
      "Please choose a date.",
    );

    isValid = false;
  }

  return isValid;
}

/* =========================================================
   TOAST
========================================================= */

function showToast(message) {
  elements.toast.textContent =
    message;

  elements.toast.classList.add(
    "is-visible",
  );

  window.clearTimeout(
    toastTimeout,
  );

  toastTimeout =
    window.setTimeout(() => {
      elements.toast.classList.remove(
        "is-visible",
      );
    }, 2600);
}

/* =========================================================
   ADD EXPENSE
========================================================= */

async function handleFormSubmit(event) {
  event.preventDefault();

  if (!currentUser) {
    showToast("Please login first.");
    return;
  }

  if (!validateForm()) {
    return;
  }

  const newExpense = {
    id: makeId(),

    title:
      elements.titleInput.value.trim(),

    amount:
      Number(elements.amountInput.value),

    category:
      elements.categoryInput.value,

    date:
      elements.dateInput.value,
  };

  expenses.push(newExpense);

  const saved =
    await saveExpenses();

  if (!saved) {
    expenses = expenses.filter(
      (expense) =>
        expense.id !== newExpense.id,
    );

    return;
  }

  elements.form.reset();

  elements.dateInput.value =
    getTodayString();

  clearValidation();

  renderApp();

  showToast(
    "Expense added successfully.",
  );
}

/* =========================================================
   DELETE EXPENSE
========================================================= */

async function handleDelete(event) {
  const deleteButton =
    event.target.closest(
      ".delete-button",
    );

  if (!deleteButton) {
    return;
  }

  const expense =
    expenses.find(
      (item) =>
        item.id ===
        deleteButton.dataset.id,
    );

  if (!expense) {
    return;
  }

  const shouldDelete =
    window.confirm(
      `Delete "${expense.title}" (${formatIndianRupees(expense.amount)})?`,
    );

  if (!shouldDelete) {
    return;
  }

  const oldExpenses =
    [...expenses];

  expenses =
    expenses.filter(
      (item) =>
        item.id !== expense.id,
    );

  const saved =
    await saveExpenses();

  if (!saved) {
    expenses =
      oldExpenses;

    return;
  }

  renderApp();

  showToast(
    "Expense deleted.",
  );
}

/* =========================================================
   FILTERS
========================================================= */

function clearFilters() {
  elements.searchInput.value = "";

  elements.filterCategory.value =
    "all";

  renderExpenses();
}

/* =========================================================
   INITIALISE
========================================================= */

async function initialiseApp() {
  createAuthUI();

  elements.todayDate.textContent =
    formatDate(getTodayString());

  elements.dateInput.value =
    getTodayString();

  elements.form.addEventListener(
    "submit",
    handleFormSubmit,
  );

  elements.tableBody.addEventListener(
    "click",
    handleDelete,
  );

  elements.searchInput.addEventListener(
    "input",
    renderExpenses,
  );

  elements.filterCategory.addEventListener(
    "change",
    renderExpenses,
  );

  elements.sortExpenses.addEventListener(
    "change",
    renderExpenses,
  );

  elements.clearFilters.addEventListener(
    "click",
    clearFilters,
  );

  /*
   * Process email confirmation,
   * OAuth and password recovery links.
   */
  try {
    await handleAuthCallback();
  } catch (error) {
    console.error(
      "Auth callback error:",
      error,
    );
  }

  /*
   * Check existing login session.
   */
  try {
    const user =
      await getUser();

    await updateAuthUI(user);
  } catch (error) {
    console.error(
      "Could not get user:",
      error,
    );

    await updateAuthUI(null);
  }

  /*
   * Watch login/logout changes.
   */
  onAuthChange(
    async (_event, user) => {
      await updateAuthUI(user);
    },
  );

  renderApp();
}

initialiseApp();
