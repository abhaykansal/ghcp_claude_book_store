/**
 * Frontend Application Logic
 * Handles form submissions and API interactions
 */

const API_BASE_URL = `${window.location.origin}/api`;

// ============================================================================
// Add Book Form Logic
// ============================================================================

const addBookForm = document.getElementById('addBookForm');
if (addBookForm) {
  addBookForm.addEventListener('submit', handleAddBookSubmit);
  loadGenres();
}

async function loadGenres() {
  const genreSelect = document.getElementById('genre');
  if (!genreSelect) return;

  try {
    const response = await fetch(`${API_BASE_URL}/books/genres`);
    const data = await response.json();
    if (!response.ok || !Array.isArray(data.genres)) {
      throw new Error('Invalid genre response');
    }

    genreSelect.innerHTML = '<option value="">Select genre</option>';
    data.genres.forEach((genre) => {
      const option = document.createElement('option');
      option.value = genre;
      option.textContent = genre;
      genreSelect.appendChild(option);
    });
    genreSelect.disabled = false;
  } catch (error) {
    console.error('Error loading genres:', error);
    genreSelect.innerHTML = '<option value="">Genres unavailable</option>';
    showErrorMessage('Unable to load genres. Please refresh and try again.');
  }
}

/**
 * Handle Add Book form submission
 */
async function handleAddBookSubmit(event) {
  event.preventDefault();

  const bookNameInput = document.getElementById('bookName');
  const authorNameInput = document.getElementById('authorName');
  const isbnInput = document.getElementById('isbn');
  const publicationYearInput = document.getElementById('publicationYear');
  const genreInput = document.getElementById('genre');
  const publisherInput = document.getElementById('publisher');
  const totalCopiesInput = document.getElementById('totalCopies');
  const availableCopiesInput = document.getElementById('availableCopies');

  const book = {
    bookName: bookNameInput.value.trim(),
    authorName: authorNameInput.value.trim(),
    isbn: isbnInput.value.trim(),
    publicationYear: publicationYearInput.value,
    genre: genreInput.value,
    publisher: publisherInput.value.trim(),
    totalCopies: totalCopiesInput.value,
    availableCopies: availableCopiesInput.value,
  };

  // Clear previous messages
  clearMessage();

  try {
    // Show loading state
    const submitBtn = addBookForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding...';

    // Make API call
    const response = await fetch(`${API_BASE_URL}/books`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(book),
    });

    const data = await response.json();

    if (response.ok) {
      // Success
      showSuccessMessage('Book added successfully!');
      addBookForm.reset();
      bookNameInput.focus();
    } else {
      // Validation or server error
      if (data.errors && Array.isArray(data.errors)) {
        const errorMessages = data.errors
          .map((e) => `${e.field}: ${e.message}`)
          .join('\n');
        showErrorMessage(`Validation failed:\n${errorMessages}`, data.errors);
      } else {
        showErrorMessage(data.message || 'Failed to add book');
      }
    }
  } catch (error) {
    console.error('Error adding book:', error);
    showErrorMessage('Network error. Please try again.');
  } finally {
    const submitBtn = addBookForm.querySelector('button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Add Book';
  }
}

// ============================================================================
// Search Books Form Logic
// ============================================================================

const searchForm = document.getElementById('searchForm');
if (searchForm) {
  searchForm.addEventListener('submit', handleSearchSubmit);
}

/**
 * Handle Search form submission
 */
async function handleSearchSubmit(event) {
  event.preventDefault();

  const titleInput = document.getElementById('searchTitle');
  const authorInput = document.getElementById('searchAuthor');
  const isbnInput = document.getElementById('searchISBN');

  const title = titleInput?.value.trim() || '';
  const author = authorInput?.value.trim() || '';
  const isbn = isbnInput?.value.trim() || '';

  // Validate that at least one criterion is provided
  if (!title && !author && !isbn) {
    showSearchError('Please enter at least one search criterion');
    return;
  }

  // Clear previous results
  clearSearchResults();

  try {
    // Show loading state
    const submitBtn = searchForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Searching...';

    // Build query string
    let query = '';
    if (title) {
      query = `title=${encodeURIComponent(title)}`;
    } else if (author) {
      query = `author=${encodeURIComponent(author)}`;
    } else if (isbn) {
      query = `isbn=${encodeURIComponent(isbn)}`;
    }

    // Make API call
    const response = await fetch(`${API_BASE_URL}/books/search?${query}`);
    const data = await response.json();

    if (response.ok) {
      // Display results
      displaySearchResults(data);
    } else {
      showSearchError(data.message || 'Search failed');
    }
  } catch (error) {
    console.error('Error searching books:', error);
    showSearchError('Network error. Please try again.');
  } finally {
    const submitBtn = searchForm.querySelector('button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Search';
  }
}

/**
 * Display search results
 */
function displaySearchResults(data) {
  const searchResults = document.getElementById('searchResults');
  const noResultsMessage = document.getElementById('noResultsMessage');
  const resultsTableContainer = document.getElementById('resultsTableContainer');
  const resultCount = document.getElementById('resultCount');
  const resultsTableBody = document.getElementById('resultsTableBody');

  if (!data.results || data.results.length === 0) {
    // No results found
    noResultsMessage.classList.remove('hidden');
    resultsTableContainer.classList.add('hidden');
    searchResults.classList.remove('hidden');
  } else {
    // Display results in table
    noResultsMessage.classList.add('hidden');
    resultsTableContainer.classList.remove('hidden');
    searchResults.classList.remove('hidden');

    resultCount.textContent = data.count;
    resultsTableBody.innerHTML = '';

    data.results.forEach((book) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${escapeHtml(book.bookId)}</td>
        <td>${escapeHtml(book.title)}</td>
        <td>${escapeHtml(book.author)}</td>
        <td>${escapeHtml(book.isbn)}</td>
      `;
      resultsTableBody.appendChild(row);
    });
  }
}

// ============================================================================
// Message Display Logic
// ============================================================================

/**
 * Show success message (for Add Book form)
 */
function showSuccessMessage(message) {
  const messageArea = document.getElementById('messageArea');
  const messageContent = document.getElementById('messageContent');

  if (!messageArea) return;

  messageArea.classList.remove('hidden', 'error');
  messageArea.classList.add('success');
  messageContent.innerHTML = `<p><strong>Success:</strong> ${escapeHtml(message)}</p>`;
}

/**
 * Show error message (for Add Book form)
 */
function showErrorMessage(message, errors) {
  const messageArea = document.getElementById('messageArea');
  const messageContent = document.getElementById('messageContent');

  if (!messageArea) return;

  messageArea.classList.remove('hidden', 'success');
  messageArea.classList.add('error');

  if (errors && Array.isArray(errors)) {
    const errorList = errors
      .map((e) => `<li>${escapeHtml(e.field)}: ${escapeHtml(e.message)}</li>`)
      .join('');
    messageContent.innerHTML = `
      <p><strong>Validation Errors:</strong></p>
      <ul>${errorList}</ul>
    `;
  } else {
    messageContent.innerHTML = `<p><strong>Error:</strong> ${escapeHtml(message)}</p>`;
  }
}

/**
 * Clear message
 */
function clearMessage() {
  const messageArea = document.getElementById('messageArea');
  if (messageArea) {
    messageArea.classList.add('hidden');
    messageArea.classList.remove('success', 'error');
  }
}

/**
 * Show search error
 */
function showSearchError(message) {
  const noResultsMessage = document.getElementById('noResultsMessage');
  if (noResultsMessage) {
    noResultsMessage.classList.remove('hidden');
    noResultsMessage.innerHTML = `<p><strong>Error:</strong> ${escapeHtml(message)}</p>`;
  }
}

/**
 * Clear search results
 */
function clearSearchResults() {
  const searchResults = document.getElementById('searchResults');
  const noResultsMessage = document.getElementById('noResultsMessage');
  const resultsTableContainer = document.getElementById('resultsTableContainer');

  if (searchResults) {
    searchResults.classList.add('hidden');
  }
  if (noResultsMessage) {
    noResultsMessage.classList.add('hidden');
  }
  if (resultsTableContainer) {
    resultsTableContainer.classList.add('hidden');
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}
