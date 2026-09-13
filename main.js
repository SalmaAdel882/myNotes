function makeId() {
  return "n_" + Math.random().toString(36).slice(2, 10);
}
let notes = [];

const CATEGORY_LABEL = {
  study: "Study",
  projects: "Projects",
  ideas: "Ideas",
  personal: "Personal",
  general: "General",
};

function formatDate(isoDate) {
  const date = new Date(isoDate);
  return date.toLocaleDateString(undefined, {day: "numeric", month: "short"});
}

let currentView = "all";     
let currentFilter = "all";  
let currentSort = "newest";  
let searchTerm = "";         


const notesGrid = document.getElementById("notesGrid");
const emptyState = document.getElementById("emptyState");
const viewTitle = document.getElementById("viewTitle");
const viewSub = document.getElementById("viewSub");
const chipRow = document.getElementById("chipRow");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");

const modalOverlay = document.getElementById("modalOverlay");
const modalTitle = document.getElementById("modalTitle");
const noteTitleInput = document.getElementById("noteTitleInput");
const noteBodyInput = document.getElementById("noteBodyInput");
const noteCategoryInput = document.getElementById("noteCategoryInput");

const toastWrap = document.getElementById("toastWrap");
const sidebar = document.getElementById("sidebar");
let selectedNoteColor = "lavender"; 
let editingId = null;

const VIEW_META = {
  all: { title: "All Notes", sub: "Everything you've written, in one place" },
  favorites: { title: "Favorites", sub: "Notes you've starred" },
  pinned: { title: "Pinned", sub: "Notes kept at the top of your mind" },
  archive: { title: "Archive", sub: "Archived notes and completed tasks" },
  trash: { title: "Trash", sub: "Deleted notes — restore or remove for good" },
  "cat-study": { title: "Study", sub: "Notes tagged Study" },
  "cat-projects": { title: "Projects", sub: "Notes tagged Projects" },
  "cat-ideas": { title: "Ideas", sub: "Notes tagged Ideas" },
  "cat-personal": { title: "Personal", sub: "Notes tagged Personal" },
};


function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML =
    '<i class="fa-solid fa-check" style="color: rgb(115, 115, 115);"></i>' +
    "<span>" + message + "</span>";

  toastWrap.appendChild(toast);

  setTimeout(() => {
    setTimeout(() => toast.remove(), 250);
  }, 2200);
}


const navItems = document.querySelectorAll(".nav-item[data-view]");

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    navItems.forEach((i) => i.classList.remove("active"));
    item.classList.add("active");
    currentView = item.dataset.view;
    currentFilter = "all";

    chipRow.style.display = currentView === "all" ? "flex" : "none";
    const meta = VIEW_META[currentView] || VIEW_META.all;
    viewTitle.textContent = meta.title;
    viewSub.textContent = meta.sub;

    render();
    closeMobileSidebar();
  });
});

chipRow.addEventListener("click", (event) => {
  const clickedChip = event.target.closest(".chip");
  if (!clickedChip) 
    return; 
  document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
  clickedChip.classList.add("active");

  currentFilter = clickedChip.dataset.filter;
  render();
});

searchInput.addEventListener("input", (event) => {
  searchTerm = event.target.value.trim().toLowerCase();
  render();
});

sortSelect.addEventListener("change", (event) => {
  currentSort = event.target.value;
  render();
});

let isDarkMode = false;

function setTheme(dark) {
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}
function toggleTheme() {
  isDarkMode = !isDarkMode;
  setTheme(isDarkMode);
  showToast(isDarkMode ? "Dark mode on" : "Light mode on");
}

document.getElementById("themeToggleTop").addEventListener("click", toggleTheme);
document.getElementById("theme-toggle-nav").addEventListener("click", toggleTheme);

document.getElementById("menuBtn").addEventListener("click", () => {
  sidebar.classList.toggle("open");
});

function closeMobileSidebar() {
  sidebar.classList.remove("open");
}


const colorDots = document.querySelectorAll(".color-dot");

function openModal(note) {
  editingId = note ? note.id : null;

  modalTitle.textContent = note ? "Edit note" : "New note";
  noteTitleInput.value = note ? note.title : "";
  noteBodyInput.value = note ? note.body : "";
  noteCategoryInput.value = note ? note.category : "general";

  selectedNoteColor = note && note.customColor ? note.customColor : "lavender";
  colorDots.forEach((dot) => {
    if (dot.dataset.color === selectedNoteColor) {
      dot.classList.add("selected");
    } else {
      dot.classList.remove("selected");
    }
  });

  modalOverlay.classList.add("open");
  setTimeout(() => noteTitleInput.focus(), 50);
}

function closeModal() {
  modalOverlay.classList.remove("open");
}

document.getElementById("newNoteBtn").addEventListener("click", () => openModal(null));
document.getElementById("modalClose").addEventListener("click", closeModal);
document.getElementById("cancelBtn").addEventListener("click", closeModal);

colorDots.forEach((dot) => {
  dot.addEventListener("click", () => {
    colorDots.forEach((d) => d.classList.remove("selected"));
    dot.classList.add("selected");
    selectedNoteColor = dot.dataset.color;
  });
});

document.getElementById("saveNoteBtn").addEventListener("click", () => {
  const title = noteTitleInput.value.trim();
  const body = noteBodyInput.value.trim();
  const category = noteCategoryInput.value;
  const noteType = document.getElementById("noteTypeSelect") ? document.getElementById("noteTypeSelect").value : "note";

  if (!title) {
    showToast("Give your note a title");
    noteTitleInput.focus();
    return;
  }

  if (editingId) {
    const existingNote = notes.find((n) => n.id === editingId);
    if (existingNote) {
      existingNote.title = title;
      existingNote.body = body;
      existingNote.category = category;
      existingNote.customColor = selectedNoteColor;
      existingNote.type = noteType;
    }
    showToast("Note updated");
  } else {
    notes.unshift({
      id: makeId(),
      title,
      body,
      category,
      type: noteType,
      customColor: selectedNoteColor,
      progress: 0,
      pinned: false,
      favorite: false,
      archived: false, 
      trashed: false,
      date: new Date().toISOString(),
    });
    showToast("Note created");
    renderMotivationBanner();
  }

  closeModal();
  render();
});

function getVisibleNotes() {
  let list = notes.slice();
  if (currentView === "trash") {
    list = list.filter((n) => n.trashed);
  } else if (currentView === "archive") {
    list = list.filter((n) => n.archived && !n.trashed); 
  } else {
    list = list.filter((n) => !n.trashed && !n.archived);

    if (currentView === "favorites") {
      list = list.filter((n) => n.favorite);
    } else if (currentView === "pinned") {
      list = list.filter((n) => n.pinned);
    } else if (currentView.startsWith("cat-")) {
      const categoryName = currentView.replace("cat-", "");
      list = list.filter((n) => n.category === categoryName);
    } else if (currentView === "all" && currentFilter !== "all") {
      list = list.filter((n) => n.category === currentFilter);
    }
  }

  if (searchTerm) {
    list = list.filter(
      (n) =>
        n.title.toLowerCase().includes(searchTerm) ||
        n.body.toLowerCase().includes(searchTerm)
    );
  }

  if (currentSort === "oldest") {
    list.sort((a, b) => new Date(a.date) - new Date(b.date));
  } else if (currentSort === "az") {
    list.sort((a, b) => a.title.localeCompare(b.title));
  } else if (currentSort === "za") {
    list.sort((a, b) => b.title.localeCompare(a.title));
  } else {
    list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  if (currentView !== "trash" && currentView !== "archive") {
    list.sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }
  return list;
}

function buildCard(note) {
  const card = document.createElement("div");
  const colorClass = note.customColor ? "custom-bg-" + note.customColor : "cat-" + note.category;
  card.className = "note-card " + colorClass;

  const inTrash = note.trashed;

  const topActionsHtml = inTrash
    ? ""
    : `
      <div class="note-icon-btn ${note.archived ? "on" : ""}" data-action="archive" title="${note.archived ? "Unarchive" : "Archive"}">
        <i class="fa-solid fa-box-archive"></i>
      </div>
      <div class="note-icon-btn ${note.pinned ? "on" : ""}" data-action="pin" title="Pin">
        <i class="fa-solid fa-thumbtack pin-icon"></i>
      </div>
      <div class="note-icon-btn ${note.favorite ? "fav-on" : ""}" data-action="fav" title="Favorite">
        <i class="fa-regular fa-heart heart-icon"></i>
      </div>
      <div class="note-icon-btn" data-action="edit" title="Edit">
        <i class="fa-regular fa-pen-to-square" style="color: rgb(115, 115, 115);"></i>
      </div>`;

  const bottomActionsHtml = inTrash
    ? `
      <span style="display:flex;gap:10px;">
        <span class="note-del" data-action="restore" title="Restore">
        <i class="fa-solid fa-arrow-rotate-left"></i>
        </span>
        <span class="note-del" data-action="delete-forever" title="Delete forever">
          <i class="fa-solid fa-trash-can"></i>
        </span>
      </span>`
    : `
      <span class="note-del" data-action="trash" title="Move to trash">
      <i class="fa-solid fa-trash-can"></i>
        </span>`;

  let contentHtml = "";
  
  if (note.type === "task") {
    const progress = note.progress !== undefined ? note.progress : 0;
    const completedDots = progress / 20;

    let dotsHtml = '<div class="task-dots-row">';
    for (let i = 1; i <= 5; i++) {
      const isActive = i <= completedDots ? "active-dot" : "";
      dotsHtml += `<div class="interactive-dot ${isActive}" data-note-id="${note.id}" data-dot-index="${i}" title="${i * 20}%"></div>`;
    }
    dotsHtml += '</div>';

    const completionBadge = progress === 100 
      ? '<span style="color: var(--accent); font-weight:700; font-size:11px;"><i class="fa-solid fa-check-circle"></i> Completed</span>'
      : `<span>${progress}%</span>`;

    const lines = note.body ? note.body.split("\n").filter(l => l.trim() !== "") : [];
    contentHtml = '<div class="task-card-content">';
   
    lines.forEach((line) => {
      contentHtml += `
        <div class="task-text-item">
          <span>${escapeHtml(line)}</span>
        </div>`;
    });
    
    contentHtml += `
      <div class="task-progress-section">
        <div class="task-progress-info">
          <span>Progress</span>
          ${completionBadge}
        </div>
        ${dotsHtml}
      </div>
    `;
    contentHtml += '</div>';
  } else {
    contentHtml = `<div class="note-body">${escapeHtml(note.body) || '<span style="opacity:.6">No content</span>'}</div>`;
  }

  card.innerHTML = `
    <div class="note-top">
      <span class="note-tag">${CATEGORY_LABEL[note.category] || "General"}</span>
      <div class="note-actions">${topActionsHtml}</div>
    </div>
    <div class="note-title">${escapeHtml(note.title)}</div>
    ${contentHtml}
    <div class="note-foot">
      <span class="note-date">
        <i class="fa-regular fa-calendar"></i>
        ${formatDate(note.date)}
      </span>
      ${bottomActionsHtml}
    </div>
  `;

  card.querySelectorAll(".interactive-dot").forEach((dot) => {
    dot.addEventListener("click", () => {
      const noteId = dot.dataset.noteId;
      const dotIndex = parseInt(dot.dataset.dotIndex);
      updateTaskProgress(noteId, dotIndex * 20);
    });
  });
function updateTaskProgress(noteId, newProgress) {
  const note = notes.find((n) => n.id === noteId);
  if (note) {
    note.progress = note.progress === newProgress ? newProgress - 20 : newProgress;
    if (note.progress < 0) note.progress = 0;
    render();
  }
}

  card.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const action = button.dataset.action;
      handleAction(action, note.id);
    });
  });

  return card;
}


function handleAction(action, noteId) {
  const note = notes.find((n) => n.id === noteId);
  if (!note) return;

  if (action === "pin") {
    note.pinned = !note.pinned;
    showToast(note.pinned ? "Note pinned" : "Note unpinned");
  } else if (action === "fav") {
    note.favorite = !note.favorite;
    showToast(note.favorite ? "Added to favorites" : "Removed from favorites");
  } else if (action === "edit") {
    openModal(note);
    return;
  } else if (action === "archive") {
    note.archived = !note.archived;
    showToast(note.archived ? "Moved to archive" : "Restored from archive");
  } else if (action === "trash") {
    note.trashed = true;
    note.pinned = false;
    showToast("Note moved to trash");
  } else if (action === "restore") {
    note.trashed = false;
    showToast("Note restored");
  } else if (action === "delete-forever") {
    notes = notes.filter((n) => n.id !== noteId);
    showToast("Note permanently deleted");
  }

  render();
}

function updateCounts() {
  const activeNotes = notes.filter((n) => !n.trashed && !n.archived);

  document.getElementById("count-all").textContent = activeNotes.length;
  document.getElementById("count-favorites").textContent =
    activeNotes.filter((n) => n.favorite).length;
  document.getElementById("count-pinned").textContent =
    activeNotes.filter((n) => n.pinned).length;
  document.getElementById("count-archive").textContent =
    notes.filter((n) => n.archived && !n.trashed).length;
  document.getElementById("count-trash").textContent =
    notes.filter((n) => n.trashed).length;

  document.getElementById("count-cat-study").textContent =
    activeNotes.filter((n) => n.category === "study").length;
  document.getElementById("count-cat-projects").textContent =
    activeNotes.filter((n) => n.category === "projects").length;
  document.getElementById("count-cat-ideas").textContent =
    activeNotes.filter((n) => n.category === "ideas").length;
  document.getElementById("count-cat-personal").textContent =
    activeNotes.filter((n) => n.category === "personal").length;
}


function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

const STORAGE_KEY = "myNotesAppData";
const savedNotes = localStorage.getItem(STORAGE_KEY);
if (savedNotes) {
  notes = JSON.parse(savedNotes);
}

function render() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  updateCounts();
  const visibleNotes = getVisibleNotes();
  notesGrid.innerHTML = ""; 

  if (visibleNotes.length === 0) {
    emptyState.style.display = "block";
    notesGrid.style.display = "none";
    return;
  }
  emptyState.style.display = "none";
  notesGrid.style.display = "block";

  visibleNotes.forEach((note) => {
    notesGrid.appendChild(buildCard(note));
  });
}

const motivationalQuotes = [

"Write down your ideas; behind every great idea is a coming achievement ✨",
  "Don't postpone today's idea to tomorrow, write it down now 🚀",
  "Your brain is for having ideas, not storing them. Let your notes protect them 💡",
  "Every note you take today is a step toward achieving your goals 🎯",
  "Organize your thoughts, plan your day, and create without limits 🌟",
  "Simplicity is the secret of productivity, start by writing your first note 📝",
  "Your simple ideas today could become great projects tomorrow 💼"
];

let quoteTimer = null;

function renderMotivationBanner() {
  let banner = document.getElementById("motivationBanner");
  
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "motivationBanner";
    banner.className = "motivation-banner";
    
    const viewSubElement = document.getElementById("viewSub");
    if (viewSubElement && viewSubElement.parentNode) {
      viewSubElement.parentNode.insertBefore(banner, viewSubElement.nextSibling);
    }
  }

  const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
  banner.textContent = randomQuote;
}

function startQuoteInterval() {
  if (quoteTimer) clearInterval(quoteTimer);
  quoteTimer = setInterval(() => {
    renderMotivationBanner();
  }, 6000); 
}

render();
renderMotivationBanner();
startQuoteInterval();