/*
 * Expense Tracker
 * Data, validation, localStorage and rendering logic.
 */

const STORAGE_KEY = "expense-tracker-expenses";

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

// Demo expenses shown on first visit
const DEMO_EXPENSES = [
  {
    id: "demo-canteen",
    title: "College Canteen",
    amount: 120,
    category: "Food",
    date: "2026-09-18",
  },
  {
    id: "demo-metro",
    title: "Metro/Bus",
    amount: 80,
    category: "Travel",
    date: "2026-09-17",
  },
  {
    id: "demo-stationery",
    title: "Stationery",
    amount: 350,
    category: "Education",
    date: "2026-09-15",
  },
  {
    id: "demo-recharge",
    title: "Mobile Recharge",
    amount: 299,
    category: "Bills",
    date: "2026-09-12",
  },
  {
    id: "demo-groceries",
    title: "Groceries",
    amount: 1500,
    category: "Food",
    date: "2026-09-10",
  },
];

let expenses = loadExpenses();
let toastTimeout;

// Get HTML elements
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


// --------------------------------------------------
// Format amount as Indian Rupees
// --------------------------------------------------

function formatIndianRupees(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}


// --------------------------------------------------
// Get today's date in YYYY-MM-DD format
// --------------------------------------------------

function getTodayString() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


// --------------------------------------------------
// Format date for display
// --------------------------------------------------

function formatDate(dateString) {
  if (!dateString) {
    return "—";
  }

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


// --------------------------------------------------
// Load expenses from localStorage
// --------------------------------------------------

function loadExpenses() {
  try {
    const savedExpenses = localStorage.getItem(STORAGE_KEY);

    if (!savedExpenses) {
      return [...DEMO_EXPENSES];
    }

    const parsedExpenses = JSON.parse(savedExpenses);

    if (!Array.isArray(parsedExpenses)) {
      return [...DEMO_EXPENSES];
    }

    return parsedExpenses.filter(
      (expense) =>
        expense &&
        typeof expense.title === "string" &&
        Number.isFinite(Number(expense.amount)) &&
        CATEGORIES.includes(expense.category) &&
        typeof expense.date === "string"
    );
  } catch (error) {
    console.error("Error loading expenses:", error);

    return [...DEMO_EXPENSES];
  }
}


// --------------------------------------------------
// Save expenses to localStorage
// --------------------------------------------------

function saveExpenses() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(expenses)
  );
}


// --------------------------------------------------
// Generate unique ID
// --------------------------------------------------

function makeId() {
  return `${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}


// --------------------------------------------------
// Convert category name to CSS class
// --------------------------------------------------

function getCategorySlug(category) {
  return category
    .toLowerCase()
    .replace(/\s+/g, "-");
}


// --------------------------------------------------
// Calculate category totals
// --------------------------------------------------

function getCategoryTotals() {
  const totals = Object.fromEntries(
    CATEGORIES.map((category) => [category, 0])
  );

  expenses.forEach((expense) => {
    totals[expense.category] += Number(expense.amount);
  });

  return totals;
}


// --------------------------------------------------
// Get expenses after search/filter/sort
// --------------------------------------------------

function getVisibleExpenses() {
  const searchTerm =
    elements.searchInput.value.trim().toLowerCase();

  const selectedCategory =
    elements.filterCategory.value;

  const selectedSort =
    elements.sortExpenses.value;

  const visibleExpenses = expenses.filter((expense) => {
    const titleMatches = expense.title
      .toLowerCase()
      .includes(searchTerm);

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
      return (
        Number(second.amount) -
        Number(first.amount)
      );
    }

    if (selectedSort === "lowest") {
      return (
        Number(first.amount) -
        Number(second.amount)
      );
    }

    // Newest first
    return second.date.localeCompare(first.date);
  });
}


// --------------------------------------------------
// Update summary cards
// --------------------------------------------------

function updateSummary() {
  const total = expenses.reduce(
    (sum, expense) =>
      sum + Number(expense.amount),
    0
  );

  const highest = expenses.reduce(
    (currentHighest, expense) =>
      Number(expense.amount) >
      Number(currentHighest.amount || 0)
        ? expense
        : currentHighest,
    {}
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


// --------------------------------------------------
// Render category spending
// --------------------------------------------------

function renderCategoryTotals() {
  const totals = getCategoryTotals();

  const highestCategoryTotal = Math.max(
    ...Object.values(totals),
    1
  );

  elements.categoryList.replaceChildren();

  CATEGORIES.forEach((category) => {
    const item = document.createElement("div");

    item.className = "category-item";


    // Heading
    const heading = document.createElement("div");

    heading.className =
      "category-item-heading";


    // Category label
    const label = document.createElement("div");

    label.className = "category-label";


    // Category dot
    const dot = document.createElement("span");

    dot.className =
      `category-dot category-dot-${getCategorySlug(category)}`;

    dot.setAttribute("aria-hidden", "true");


    // Category name
    const labelText =
      document.createElement("span");

    labelText.textContent = category;

    label.append(dot, labelText);


    // Amount
    const amount =
      document.createElement("span");

    amount.className = "category-amount";

    amount.textContent =
      formatIndianRupees(totals[category]);

    heading.append(label, amount);


    // Progress bar
    const bar =
      document.createElement("div");

    bar.className = "category-bar";

    bar.setAttribute(
      "role",
      "progressbar"
    );

    bar.setAttribute(
      "aria-label",
      `${category} spending`
    );

    bar.setAttribute(
      "aria-valuemin",
      "0"
    );

    bar.setAttribute(
      "aria-valuemax",
      String(highestCategoryTotal)
    );

    bar.setAttribute(
      "aria-valuenow",
      String(totals[category])
    );


    // Progress fill
    const fill =
      document.createElement("div");

    fill.className =
      `category-bar-fill category-bar-fill-${getCategorySlug(category)}`;

    fill.style.width =
      `${(totals[category] / highestCategoryTotal) * 100}%`;

    bar.append(fill);


    item.append(heading, bar);

    elements.categoryList.append(item);
  });
}


// --------------------------------------------------
// Render expense table
// --------------------------------------------------

function renderExpenses() {
  const visibleExpenses =
    getVisibleExpenses();

  const hasFilters =
    elements.searchInput.value.trim() !== "" ||
    elements.filterCategory.value !== "all";


  // Clear old rows
  elements.tableBody.replaceChildren();


  // Create rows
  visibleExpenses.forEach((expense) => {
    const row =
      document.createElement("tr");


    // Title
    const titleCell =
      document.createElement("td");

    titleCell.className =
      "expense-title-cell";

    titleCell.textContent =
      expense.title;


    // Category
    const categoryCell =
      document.createElement("td");

    const categoryBadge =
      document.createElement("span");

    categoryBadge.className =
      `category-badge category-badge-${getCategorySlug(
        expense.category
      )}`;

    categoryBadge.textContent =
      expense.category;

    categoryCell.append(categoryBadge);


    // Amount
    const amountCell =
      document.createElement("td");

    amountCell.className =
      "expense-amount-cell";

    amountCell.textContent =
      formatIndianRupees(expense.amount);


    // Date
    const dateCell =
      document.createElement("td");

    dateCell.className =
      "expense-date-cell";

    dateCell.textContent =
      formatDate(expense.date);


    // Delete button
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
      `Delete ${expense.title}`
    );

    deleteButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4.5 7h15M9.5 7V4.5h5V7M7 7l.7 12.5h8.6L17 7M10 10.5v6M14 10.5v6" />
      </svg>
    `;

    actionCell.append(deleteButton);


    // Add all cells
    row.append(
      titleCell,
      categoryCell,
      amountCell,
      dateCell,
      actionCell
    );

    elements.tableBody.append(row);
  });


  // Result count
  const visibleCount =
    visibleExpenses.length;

  elements.resultCount.textContent =
    `${visibleCount} ${
      visibleCount === 1
        ? "expense"
        : "expenses"
    }`;


  // Empty state
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


// --------------------------------------------------
// Render complete application
// --------------------------------------------------

function renderApp() {
  updateSummary();
  renderCategoryTotals();
  renderExpenses();
}


// --------------------------------------------------
// Clear form validation
// --------------------------------------------------

function clearValidation() {
  const fields = [
    ["titleInput", "titleError"],
    ["amountInput", "amountError"],
    ["categoryInput", "categoryError"],
    ["dateInput", "dateError"],
  ];

  fields.forEach(
    ([inputName, errorName]) => {
      elements[inputName]
        .classList
        .remove("input-error");

      elements[errorName]
        .textContent = "";
    }
  );
}


// --------------------------------------------------
// Show validation error
// --------------------------------------------------

function setFieldError(
  inputElement,
  errorElement,
  message
) {
  inputElement.classList.add(
    "input-error"
  );

  errorElement.textContent =
    message;
}


// --------------------------------------------------
// Validate expense form
// --------------------------------------------------

function validateForm() {
  clearValidation();

  let isValid = true;


  // Title
  if (!elements.titleInput.value.trim()) {
    setFieldError(
      elements.titleInput,
      elements.titleError,
      "Please enter an expense title."
    );

    isValid = false;
  }


  // Amount
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
      "Amount must be greater than ₹0."
    );

    isValid = false;
  }


  // Category
  if (!elements.categoryInput.value) {
    setFieldError(
      elements.categoryInput,
      elements.categoryError,
      "Please select a category."
    );

    isValid = false;
  }


  // Date
  if (!elements.dateInput.value) {
    setFieldError(
      elements.dateInput,
      elements.dateError,
      "Please choose a date."
    );

    isValid = false;
  }

  return isValid;
}


// --------------------------------------------------
// Show toast message
// --------------------------------------------------

function showToast(message) {
  elements.toast.textContent =
    message;

  elements.toast.classList.add(
    "is-visible"
  );

  window.clearTimeout(
    toastTimeout
  );

  toastTimeout =
    window.setTimeout(() => {
      elements.toast.classList.remove(
        "is-visible"
      );
    }, 2600);
}


// --------------------------------------------------
// Add expense
// --------------------------------------------------

function handleFormSubmit(event) {
  event.preventDefault();

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


  // Add expense
  expenses.push(newExpense);


  // Save
  saveExpenses();


  // Reset form
  elements.form.reset();

  elements.dateInput.value =
    getTodayString();

  clearValidation();


  // Update UI
  renderApp();


  // Message
  showToast(
    "Expense added successfully."
  );
}


// --------------------------------------------------
// Delete expense
// --------------------------------------------------

function handleDelete(event) {
  const deleteButton =
    event.target.closest(
      ".delete-button"
    );

  if (!deleteButton) {
    return;
  }


  const expense =
    expenses.find(
      (item) =>
        item.id ===
        deleteButton.dataset.id
    );

  if (!expense) {
    return;
  }


  const shouldDelete =
    window.confirm(
      `Delete "${expense.title}" (${formatIndianRupees(
        expense.amount
      )})?`
    );

  if (!shouldDelete) {
    return;
  }


  // Remove expense
  expenses =
    expenses.filter(
      (item) =>
        item.id !== expense.id
    );


  // Save updated data
  saveExpenses();


  // Update UI
  renderApp();


  // Message
  showToast(
    "Expense deleted."
  );
}


// --------------------------------------------------
// Clear search and filters
// --------------------------------------------------

function clearFilters() {
  elements.searchInput.value = "";

  elements.filterCategory.value =
    "all";

  renderExpenses();
}


// --------------------------------------------------
// Start application
// --------------------------------------------------

function initialiseApp() {
  elements.todayDate.textContent =
    formatDate(
      getTodayString()
    );

  elements.dateInput.value =
    getTodayString();


  // Form submit
  elements.form.addEventListener(
    "submit",
    handleFormSubmit
  );


  // Delete
  elements.tableBody.addEventListener(
    "click",
    handleDelete
  );


  // Search
  elements.searchInput.addEventListener(
    "input",
    renderExpenses
  );


  // Category filter
  elements.filterCategory.addEventListener(
    "change",
    renderExpenses
  );


  // Sorting
  elements.sortExpenses.addEventListener(
    "change",
    renderExpenses
  );


  // Clear filters
  elements.clearFilters.addEventListener(
    "click",
    clearFilters
  );


  // Initial render
  renderApp();
}


// --------------------------------------------------
// Run app
// --------------------------------------------------

initialiseApp();