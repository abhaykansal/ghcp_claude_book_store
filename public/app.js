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
        <td class="rating-cell" id="rating-${escapeHtml(book.isbn)}">Loading...</td>
        <td>
          <button type="button" class="btn btn-small btn-secondary" onclick="toggleReviewPanel('${escapeHtml(book.isbn)}')">
            View/Add Reviews
          </button>
        </td>
      `;
      resultsTableBody.appendChild(row);

      const detailRow = document.createElement('tr');
      detailRow.id = `review-panel-row-${escapeHtml(book.isbn)}`;
      detailRow.className = 'review-panel-row hidden';
      detailRow.innerHTML = `
        <td colspan="6">
          <div id="review-panel-${escapeHtml(book.isbn)}" class="review-panel"></div>
        </td>
      `;
      resultsTableBody.appendChild(detailRow);

      loadAverageRating(book.isbn);
    });
  }
}

// ============================================================================
// Rating & Review Logic
// ============================================================================

/**
 * Load and display the average rating for a book in its results row
 */
async function loadAverageRating(isbn) {
  const ratingCell = document.getElementById(`rating-${isbn}`);
  if (!ratingCell) return;

  try {
    const response = await fetch(`${API_BASE_URL}/books/${encodeURIComponent(isbn)}/reviews`);
    const data = await response.json();

    if (response.ok) {
      ratingCell.textContent =
        data.reviewCount > 0 ? `${data.averageRating} ★ (${data.reviewCount})` : 'No ratings yet';
    } else {
      ratingCell.textContent = 'N/A';
    }
  } catch (error) {
    console.error('Error loading average rating:', error);
    ratingCell.textContent = 'N/A';
  }
}

/**
 * Toggle the review panel for a given book (view reviews + submit new review)
 */
async function toggleReviewPanel(isbn) {
  const panelRow = document.getElementById(`review-panel-row-${isbn}`);
  const panel = document.getElementById(`review-panel-${isbn}`);
  if (!panelRow || !panel) return;

  const isHidden = panelRow.classList.contains('hidden');
  if (!isHidden) {
    panelRow.classList.add('hidden');
    return;
  }

  panelRow.classList.remove('hidden');
  await renderReviewPanel(isbn);
}

/**
 * Fetch reviews for a book and render the review list + submission form
 */
async function renderReviewPanel(isbn) {
  const panel = document.getElementById(`review-panel-${isbn}`);
  if (!panel) return;

  panel.innerHTML = '<p>Loading reviews...</p>';

  try {
    const response = await fetch(`${API_BASE_URL}/books/${encodeURIComponent(isbn)}/reviews`);
    const data = await response.json();

    if (!response.ok) {
      panel.innerHTML = `<p class="review-error">${escapeHtml(data.message || 'Unable to load reviews')}</p>`;
      return;
    }

    const reviewsListHtml =
      data.reviews.length === 0
        ? '<p class="no-reviews-message">No reviews yet. Be the first to review this book!</p>'
        : `<ul class="reviews-list">${data.reviews
            .map(
              (review) => `
              <li class="review-item">
                <span class="review-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span>
                <p class="review-text">${escapeHtml(review.reviewText)}</p>
                <span class="review-date">${escapeHtml(new Date(review.dateAdded).toLocaleDateString())}</span>
              </li>`
            )
            .join('')}</ul>`;

    panel.innerHTML = `
      <div class="review-summary">
        <strong>Average Rating:</strong> ${data.reviewCount > 0 ? `${data.averageRating} ★` : 'No ratings yet'}
        (${data.reviewCount} review${data.reviewCount === 1 ? '' : 's'})
      </div>
      ${reviewsListHtml}
      <form class="review-form" id="review-form-${isbn}">
        <div class="form-group">
          <label for="review-rating-${isbn}">Your Rating</label>
          <select id="review-rating-${isbn}" name="rating" required>
            <option value="">Select rating</option>
            <option value="1">1 - Poor</option>
            <option value="2">2 - Fair</option>
            <option value="3">3 - Good</option>
            <option value="4">4 - Very Good</option>
            <option value="5">5 - Excellent</option>
          </select>
        </div>
        <div class="form-group">
          <label for="review-text-${isbn}">Your Review</label>
          <textarea id="review-text-${isbn}" name="reviewText" rows="3" maxlength="2000" placeholder="Share your thoughts about this book" required></textarea>
        </div>
        <div id="review-message-${isbn}" class="message-area hidden"></div>
        <button type="submit" class="btn btn-primary btn-small">Submit Review</button>
      </form>
    `;

    const form = document.getElementById(`review-form-${isbn}`);
    if (form) {
      form.addEventListener('submit', (event) => handleReviewSubmit(event, isbn));
    }
  } catch (error) {
    console.error('Error loading reviews:', error);
    panel.innerHTML = '<p class="review-error">Network error. Please try again.</p>';
  }
}

/**
 * Handle review submission form
 */
async function handleReviewSubmit(event, isbn) {
  event.preventDefault();

  const ratingSelect = document.getElementById(`review-rating-${isbn}`);
  const reviewTextArea = document.getElementById(`review-text-${isbn}`);
  const messageArea = document.getElementById(`review-message-${isbn}`);
  const submitBtn = event.target.querySelector('button[type="submit"]');

  const rating = ratingSelect.value;
  const reviewText = reviewTextArea.value.trim();

  messageArea.classList.add('hidden');
  messageArea.classList.remove('success', 'error');

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    const response = await fetch(`${API_BASE_URL}/books/${encodeURIComponent(isbn)}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: Number(rating), reviewText }),
    });

    const data = await response.json();

    if (response.ok) {
      await renderReviewPanel(isbn);
      await loadAverageRating(isbn);
    } else {
      messageArea.classList.remove('hidden');
      messageArea.classList.add('error');
      if (data.errors && Array.isArray(data.errors)) {
        const errorMessages = data.errors.map((e) => escapeHtml(e.message)).join('<br>');
        messageArea.innerHTML = `<p>${errorMessages}</p>`;
      } else {
        messageArea.innerHTML = `<p>${escapeHtml(data.message || 'Failed to submit review')}</p>`;
      }
    }
  } catch (error) {
    console.error('Error submitting review:', error);
    messageArea.classList.remove('hidden');
    messageArea.classList.add('error');
    messageArea.innerHTML = '<p>Network error. Please try again.</p>';
  } finally {
    if (document.body.contains(submitBtn)) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Review';
    }
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
