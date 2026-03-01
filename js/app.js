/* ============================================================
   KiKi Research – app.js
   Scientific Research Support Website
   ============================================================ */

(function () {
  'use strict';

  /* ======================================================
     CONSTANTS & STATE
     ====================================================== */
  const ARXIV_PROXY = 'https://export.arxiv.org/api/query';
  const RESULTS_PER_PAGE = 12;

  const state = {
    search: {
      query: '',
      category: 'all',
      results: [],
      start: 0,
      totalResults: 0,
      loading: false,
    },
    notes: JSON.parse(localStorage.getItem('kiki_notes') || '[]'),
    citations: JSON.parse(localStorage.getItem('kiki_citations') || '[]'),
    editingNoteId: null,
  };

  /* ======================================================
     UTILITY
     ====================================================== */
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function saveNotes() {
    localStorage.setItem('kiki_notes', JSON.stringify(state.notes));
  }

  function saveCitations() {
    localStorage.setItem('kiki_citations', JSON.stringify(state.citations));
  }

  function showToast(message, type = '') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show ' + type;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.className = 'toast';
    }, 2800);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  /* ======================================================
     NAVIGATION
     ====================================================== */
  function initNav() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const sectionId = link.dataset.section + '-section';
        showSection(sectionId);
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      });
    });
  }

  function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active-section'));
    const target = document.getElementById(id);
    if (target) {
      target.classList.add('active-section');
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function navigateTo(sectionKey) {
    showSection(sectionKey + '-section');
    document.querySelectorAll('.nav-link').forEach(l => {
      l.classList.toggle('active', l.dataset.section === sectionKey);
    });
  }

  /* ======================================================
     SEARCH – arXiv API
     ====================================================== */
  const CATEGORY_MAP = {
    cs: 'cs',
    physics: 'physics',
    math: 'math',
    bio: 'q-bio',
    econ: 'econ',
    stat: 'stat',
    eess: 'eess',
    'q-bio': 'q-bio',
  };

  function buildArxivUrl(query, category, start) {
    let searchQuery = encodeURIComponent(query);
    if (category && category !== 'all' && CATEGORY_MAP[category]) {
      searchQuery = encodeURIComponent(`(${query}) AND cat:${CATEGORY_MAP[category]}.*`);
    }
    return `${ARXIV_PROXY}?search_query=all:${searchQuery}&start=${start}&max_results=${RESULTS_PER_PAGE}&sortBy=relevance&sortOrder=descending`;
  }

  async function fetchArxiv(query, category, start) {
    const url = buildArxivUrl(query, category, start);
    const res = await fetch(url);
    if (!res.ok) throw new Error('Không thể kết nối đến arXiv. Vui lòng thử lại.');
    const text = await res.text();
    return parseArxivXml(text);
  }

  function parseArxivXml(xml) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    const entries = doc.querySelectorAll('entry');
    const totalEl = doc.querySelector('opensearch\\:totalResults, totalResults');
    const total = totalEl ? parseInt(totalEl.textContent, 10) : 0;

    const results = Array.from(entries).map(entry => {
      const title = entry.querySelector('title')?.textContent?.replace(/\s+/g, ' ').trim() || '';
      const abstract = entry.querySelector('summary')?.textContent?.replace(/\s+/g, ' ').trim() || '';
      const published = entry.querySelector('published')?.textContent || '';
      const id = entry.querySelector('id')?.textContent?.trim() || '';
      const authors = Array.from(entry.querySelectorAll('author name')).map(a => a.textContent.trim());
      const categories = Array.from(entry.querySelectorAll('category')).map(c => c.getAttribute('term'));
      return { title, abstract, published, id, authors, categories };
    });

    return { total, results };
  }

  function renderResults(results, total, start) {
    const container = document.getElementById('search-results');
    const status = document.getElementById('search-status');

    if (results.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state-icon">🔭</div>
          <p>Không tìm thấy kết quả nào. Hãy thử từ khóa khác.</p>
        </div>`;
      status.textContent = '';
      return;
    }

    status.textContent = `Tìm thấy khoảng ${total.toLocaleString('vi-VN')} kết quả (hiển thị ${start + 1}–${start + results.length}).`;

    container.innerHTML = results.map(r => {
      const arxivId = r.id.split('/abs/').pop() || r.id;
      const mainCat = r.categories[0] || '';
      const authorsStr = r.authors.slice(0, 3).join(', ') + (r.authors.length > 3 ? ' et al.' : '');
      return `
        <div class="result-card">
          <div class="card-category">${escapeHtml(mainCat)}</div>
          <h3><a href="${escapeHtml(r.id)}" target="_blank" rel="noopener">${escapeHtml(r.title)}</a></h3>
          <div class="card-authors" title="${escapeHtml(r.authors.join(', '))}">${escapeHtml(authorsStr)}</div>
          <div class="card-abstract">${escapeHtml(r.abstract)}</div>
          <div class="card-date">📅 ${formatDate(r.published)}</div>
          <div class="card-actions">
            <a href="${escapeHtml(r.id)}" target="_blank" rel="noopener" class="btn-sm">Xem bài báo</a>
            <a href="https://arxiv.org/pdf/${encodeURIComponent(arxivId)}" target="_blank" rel="noopener" class="btn-sm">PDF</a>
            <button class="btn-sm note-from-paper"
              data-title="${escapeHtml(r.title)}"
              data-authors="${escapeHtml(r.authors.join(', '))}"
              data-url="${escapeHtml(r.id)}"
              data-date="${escapeHtml(r.published)}">
              📝 Ghi chú
            </button>
            <button class="btn-sm cite-from-paper"
              data-title="${escapeHtml(r.title)}"
              data-authors="${escapeHtml(r.authors.join(', '))}"
              data-year="${new Date(r.published).getFullYear() || ''}"
              data-doi="${escapeHtml(r.id)}">
              📚 Trích dẫn
            </button>
          </div>
        </div>`;
    }).join('');

    // Attach action listeners
    container.querySelectorAll('.note-from-paper').forEach(btn => {
      btn.addEventListener('click', () => {
        const title = btn.dataset.title;
        const authors = btn.dataset.authors;
        const url = btn.dataset.url;
        const date = btn.dataset.date;
        openNoteFromPaper(title, authors, url, date);
      });
    });

    container.querySelectorAll('.cite-from-paper').forEach(btn => {
      btn.addEventListener('click', () => {
        openCiteFromPaper(btn.dataset.title, btn.dataset.authors, btn.dataset.year, btn.dataset.doi);
      });
    });

    renderPagination(total, start);
  }

  function renderPagination(total, start) {
    // Cap at 50 pages: arXiv API allows max 30,000 results; beyond 50 pages UX degrades significantly.
    const pages = Math.min(Math.ceil(total / RESULTS_PER_PAGE), 50);
    const currentPage = Math.floor(start / RESULTS_PER_PAGE);
    const container = document.getElementById('search-pagination');
    if (pages <= 1) { container.innerHTML = ''; return; }

    let html = '';
    const makeBtn = (label, page, disabled = false) =>
      `<button class="page-btn ${page === currentPage ? 'active' : ''}" data-page="${page}" ${disabled ? 'disabled' : ''}>${label}</button>`;

    if (currentPage > 0) html += makeBtn('‹', currentPage - 1);
    let rangeStart = Math.max(0, currentPage - 2);
    let rangeEnd = Math.min(pages - 1, currentPage + 2);
    // makeBtn(label, page): label is 1-indexed (for display), page is 0-indexed (used as data-page).
    if (rangeStart > 0) html += makeBtn('1', 0) + (rangeStart > 1 ? '<span class="page-ellipsis">…</span>' : '');
    for (let i = rangeStart; i <= rangeEnd; i++) html += makeBtn(i + 1, i);
    // Last page: label = `pages` (1-indexed last page number), data-page = `pages - 1` (0-indexed).
    if (rangeEnd < pages - 1) html += (rangeEnd < pages - 2 ? '<span class="page-ellipsis">…</span>' : '') + makeBtn(pages, pages - 1);
    if (currentPage < pages - 1) html += makeBtn('›', currentPage + 1);

    container.innerHTML = html;
    container.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.dataset.page, 10);
        doSearch(state.search.query, state.search.category, page * RESULTS_PER_PAGE);
      });
    });
  }

  async function doSearch(query, category, start = 0) {
    if (!query.trim()) { showToast('Vui lòng nhập từ khóa tìm kiếm.', 'error'); return; }
    state.search.query = query;
    state.search.category = category;
    state.search.start = start;
    state.search.loading = true;

    const container = document.getElementById('search-results');
    const status = document.getElementById('search-status');
    container.innerHTML = '<div class="loading-spinner">Đang tìm kiếm…</div>';
    status.textContent = '';
    document.getElementById('search-pagination').innerHTML = '';

    try {
      const { total, results } = await fetchArxiv(query, category, start);
      state.search.results = results;
      state.search.totalResults = total;
      renderResults(results, total, start);
    } catch (err) {
      container.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">⚠️</div><p>${escapeHtml(err.message)}</p></div>`;
    } finally {
      state.search.loading = false;
    }
  }

  function initSearch() {
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const categorySelect = document.getElementById('search-category');
    const heroInput = document.getElementById('hero-search-input');
    const heroBtn = document.getElementById('hero-search-btn');

    const runSearch = () => {
      const q = searchInput.value.trim() || heroInput.value.trim();
      const cat = categorySelect.value;
      if (q) {
        navigateTo('search');
        doSearch(q, cat, 0);
      }
    };

    searchBtn.addEventListener('click', runSearch);
    searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') runSearch(); });

    heroBtn.addEventListener('click', () => {
      const q = heroInput.value.trim();
      if (!q) return;
      searchInput.value = q;
      navigateTo('search');
      doSearch(q, categorySelect.value, 0);
    });
    heroInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') heroBtn.click();
    });
  }

  /* ======================================================
     NOTES
     ====================================================== */
  function renderNotesList(filter = '') {
    const list = document.getElementById('notes-list');
    let notes = state.notes;
    if (filter) {
      const f = filter.toLowerCase();
      notes = notes.filter(n =>
        n.title.toLowerCase().includes(f) || n.content.toLowerCase().includes(f)
      );
    }
    if (notes.length === 0) {
      list.innerHTML = `<div class="notes-empty">${filter ? 'Không tìm thấy ghi chú.' : 'Chưa có ghi chú nào. Hãy tạo ghi chú đầu tiên!'}</div>`;
      return;
    }
    list.innerHTML = notes.map(note => `
      <div class="note-item" data-id="${note.id}">
        <div class="note-item-title">${escapeHtml(note.title || '(Không có tiêu đề)')}</div>
        <div class="note-item-meta">
          <span>${formatDate(note.updatedAt)}</span>
          <span class="note-item-delete" data-del-id="${note.id}" title="Xóa">✕</span>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.note-item').forEach(item => {
      item.addEventListener('click', e => {
        if (e.target.classList.contains('note-item-delete')) return;
        loadNoteIntoEditor(item.dataset.id);
      });
    });

    list.querySelectorAll('.note-item-delete').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        deleteNote(btn.dataset.delId);
      });
    });
  }

  function loadNoteIntoEditor(id) {
    const note = state.notes.find(n => n.id === id);
    if (!note) return;
    state.editingNoteId = id;
    document.getElementById('note-title').value = note.title || '';
    document.getElementById('note-content').value = note.content || '';
    document.getElementById('note-category').value = note.category || 'general';
  }

  function deleteNote(id) {
    state.notes = state.notes.filter(n => n.id !== id);
    if (state.editingNoteId === id) {
      state.editingNoteId = null;
      document.getElementById('note-title').value = '';
      document.getElementById('note-content').value = '';
    }
    saveNotes();
    renderNotesList(document.getElementById('notes-search').value);
    showToast('Đã xóa ghi chú.', '');
  }

  function saveCurrentNote() {
    const title = document.getElementById('note-title').value.trim();
    const content = document.getElementById('note-content').value.trim();
    const category = document.getElementById('note-category').value;
    if (!title && !content) { showToast('Ghi chú trống, không lưu.', 'error'); return; }
    const now = new Date().toISOString();
    if (state.editingNoteId) {
      const idx = state.notes.findIndex(n => n.id === state.editingNoteId);
      if (idx !== -1) {
        state.notes[idx] = { ...state.notes[idx], title, content, category, updatedAt: now };
      }
    } else {
      state.notes.unshift({ id: generateId(), title, content, category, createdAt: now, updatedAt: now });
    }
    saveNotes();
    renderNotesList(document.getElementById('notes-search').value);
    showToast('Đã lưu ghi chú! ✅', 'success');
  }

  function openNoteFromPaper(title, authors, url, date) {
    navigateTo('notes');
    state.editingNoteId = null;
    document.getElementById('note-title').value = title;
    document.getElementById('note-content').value =
      `Tác giả: ${authors}\nNgày: ${formatDate(date)}\nLink: ${url}\n\n--- Ghi chú ---\n`;
    document.getElementById('note-category').value = 'paper';
  }

  function initNotes() {
    document.getElementById('save-note-btn').addEventListener('click', saveCurrentNote);
    document.getElementById('clear-note-btn').addEventListener('click', () => {
      state.editingNoteId = null;
      document.getElementById('note-title').value = '';
      document.getElementById('note-content').value = '';
    });
    document.getElementById('notes-search').addEventListener('input', e => {
      renderNotesList(e.target.value);
    });
    renderNotesList();
  }

  /* ======================================================
     CITATIONS
     ====================================================== */
  function generateCitation(data, format) {
    const { title, authors, year, journal, volume, pages, doi } = data;
    const authorList = authors.split(',').map(a => a.trim()).filter(Boolean);

    switch (format) {
      case 'apa': {
        const authStr = authorList.length > 1
          ? authorList.slice(0, -1).join(', ') + ', & ' + authorList.at(-1)
          : authorList[0] || '';
        const journalPart = journal ? ` *${journal}*` : '';
        const volPart = volume ? `, *${volume}*` : '';
        const pagesPart = pages ? `, ${pages}` : '';
        const doiPart = doi ? ` ${doi}` : '';
        return `${authStr} (${year}).${title ? ' ' + title + '.' : ''}${journalPart}${volPart}${pagesPart}.${doiPart}`;
      }
      case 'mla': {
        const firstAuth = authorList[0] || '';
        const otherAuths = authorList.slice(1).join(', ');
        const authStr = firstAuth + (otherAuths ? ', ' + otherAuths : '');
        const journalPart = journal ? ` *${journal}*,` : '';
        const volPart = volume ? ` vol. ${volume},` : '';
        const pagesPart = pages ? ` pp. ${pages},` : '';
        return `${authStr}. "${title}."${journalPart}${volPart}${pagesPart} ${year}.`;
      }
      case 'chicago': {
        const authStr = authorList.join(', ');
        const journalPart = journal ? ` "${journal}"` : '';
        const volPart = volume ? ` ${volume}` : '';
        const pagesPart = pages ? ` (${year}): ${pages}` : ` (${year})`;
        return `${authStr}. "${title}."${journalPart}${volPart}${pagesPart}.`;
      }
      case 'ieee': {
        const initials = authorList.map(a => {
          const parts = a.trim().split(' ');
          const last = parts.pop();
          const inits = parts.map(p => p[0] + '.').join(' ');
          return (inits ? inits + ' ' : '') + last;
        }).join(', ');
        const journalPart = journal ? ` *${journal}*,` : '';
        const volPart = volume ? ` vol. ${volume},` : '';
        const pagesPart = pages ? ` pp. ${pages},` : '';
        const doiPart = doi ? ` doi: ${doi}` : '';
        return `${initials}, "${title},"${journalPart}${volPart}${pagesPart} ${year}.${doiPart}`;
      }
      case 'bibtex': {
        const key = (authorList[0]?.split(' ').pop() || 'Author') + year;
        const authBib = authorList.join(' and ');
        const journalLine = journal ? `  journal = {${journal}},\n` : '';
        const volLine = volume ? `  volume = {${volume}},\n` : '';
        const pagesLine = pages ? `  pages = {${pages}},\n` : '';
        const doiLine = doi ? `  url = {${doi}},\n` : '';
        return `@article{${key},\n  author = {${authBib}},\n  title = {${title}},\n  year = {${year}},\n${journalLine}${volLine}${pagesLine}${doiLine}}`;
      }
      default:
        return '';
    }
  }

  function renderSavedCitations() {
    const container = document.getElementById('saved-citations');
    if (state.citations.length === 0) {
      container.innerHTML = '<p style="font-size:.8rem;color:var(--text-muted)">Chưa có trích dẫn nào được lưu.</p>';
      return;
    }
    container.innerHTML = state.citations.map((c, idx) => `
      <div class="saved-citation-item">
        <span class="cite-format-badge">${c.format.toUpperCase()}</span>
        <span class="cite-del-btn" data-idx="${idx}">✕ Xóa</span>
        <div style="white-space:pre-wrap;word-break:break-word">${escapeHtml(c.text)}</div>
      </div>
    `).join('');
    container.querySelectorAll('.cite-del-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.citations.splice(parseInt(btn.dataset.idx, 10), 1);
        saveCitations();
        renderSavedCitations();
      });
    });
  }

  function openCiteFromPaper(title, authors, year, doi) {
    navigateTo('citation');
    document.getElementById('cite-title').value = title || '';
    document.getElementById('cite-authors').value = authors || '';
    document.getElementById('cite-year').value = year || '';
    document.getElementById('cite-doi').value = doi || '';
  }

  function initCitation() {
    const btn = document.getElementById('generate-citation-btn');
    const output = document.getElementById('citation-output');
    const copyBtn = document.getElementById('copy-citation-btn');
    const clearBtn = document.getElementById('clear-citations-btn');

    btn.addEventListener('click', () => {
      const data = {
        title: document.getElementById('cite-title').value.trim(),
        authors: document.getElementById('cite-authors').value.trim(),
        year: document.getElementById('cite-year').value.trim(),
        journal: document.getElementById('cite-journal').value.trim(),
        volume: document.getElementById('cite-volume').value.trim(),
        pages: document.getElementById('cite-pages').value.trim(),
        doi: document.getElementById('cite-doi').value.trim(),
      };
      const format = document.getElementById('cite-format').value;

      if (!data.title || !data.authors || !data.year) {
        showToast('Vui lòng điền đủ: tiêu đề, tác giả, năm.', 'error');
        return;
      }

      const citation = generateCitation(data, format);
      output.innerHTML = escapeHtml(citation);
      copyBtn.style.display = 'inline-block';
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(citation).then(() => showToast('Đã sao chép!', 'success'));
      };

      // Auto-save
      state.citations.unshift({ format, text: citation, createdAt: new Date().toISOString() });
      // Keep at most 50 citations in localStorage to avoid exceeding storage quota.
      if (state.citations.length > 50) state.citations.pop();
      saveCitations();
      renderSavedCitations();
    });

    clearBtn.addEventListener('click', () => {
      state.citations = [];
      saveCitations();
      renderSavedCitations();
    });

    renderSavedCitations();
  }

  /* ======================================================
     TOPICS
     ====================================================== */
  function initTopics() {
    document.querySelectorAll('.topic-card').forEach(card => {
      const btn = card.querySelector('.btn-topic');
      const search = () => {
        const query = card.dataset.query;
        document.getElementById('search-input').value = query;
        navigateTo('search');
        doSearch(query, 'all', 0);
      };
      btn.addEventListener('click', search);
      card.addEventListener('click', e => {
        if (e.target === btn) return;
        search();
      });
    });
  }

  /* ======================================================
     INIT
     ====================================================== */
  function init() {
    initNav();
    initSearch();
    initNotes();
    initCitation();
    initTopics();

    // Show first section
    showSection('search-section');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
