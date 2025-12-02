let data = {
  APP_ID: "US24352_SAFETY",
  VERSION: "2025",
  APP_TITLE: "US 24352 – Safety Knowledge",
  APP_SUBTITLE: "PHS - L1 Building – Assessment",
  DEADLINE: { day: 17, month: 12, label: "Submission deadline" },
  TEACHERS: [],
  ASSESSMENTS: []
};

let isLoading = false;

// For drag & drop
let draggedQuestion = null;
let draggedOption = null;

/* ---------- Utility: collapse state persistence ---------- */
function saveCollapseStates() {
  const states = {};
  const assessmentSections = document.querySelectorAll('#assessments > .section');
  assessmentSections.forEach(assDiv => {
    const assIdInput = assDiv.querySelector('.assId');
    const assId = assIdInput && assIdInput.value.trim();
    if (assId) {
      states['A:' + assId] = assDiv.classList.contains('collapsed');
    }
    const questions = assDiv.querySelectorAll('.question');
    questions.forEach(qDiv => {
      const qIdInput = qDiv.querySelector('.qId');
      const qId = qIdInput && qIdInput.value.trim();
      if (qId) {
        states['Q:' + qId] = qDiv.classList.contains('collapsed');
      }
    });
  });
  try {
    localStorage.setItem('bcats_collapse_states', JSON.stringify(states));
  } catch (e) {
    console.warn('Could not save collapse states', e);
  }
}

function restoreCollapseStates() {
  let saved;
  try {
    saved = localStorage.getItem('bcats_collapse_states');
  } catch (e) {
    saved = null;
  }
  if (!saved) return;
  let states;
  try {
    states = JSON.parse(saved);
  } catch (e) {
    return;
  }
  const assessmentSections = document.querySelectorAll('#assessments > .section');
  assessmentSections.forEach(assDiv => {
    const assIdInput = assDiv.querySelector('.assId');
    const assId = assIdInput && assIdInput.value.trim();
    if (assId && Object.prototype.hasOwnProperty.call(states, 'A:' + assId)) {
      const collapsed = !!states['A:' + assId];
      if (collapsed) {
        assDiv.classList.add('collapsed');
      } else {
        assDiv.classList.remove('collapsed');
      }
      const btn = assDiv.querySelector('.section-header .collapse-btn');
      if (btn) btn.textContent = collapsed ? '▸' : '▾';
    }
    const questions = assDiv.querySelectorAll('.question');
    questions.forEach(qDiv => {
      const qIdInput = qDiv.querySelector('.qId');
      const qId = qIdInput && qIdInput.value.trim();
      if (qId && Object.prototype.hasOwnProperty.call(states, 'Q:' + qId)) {
        const collapsed = !!states['Q:' + qId];
        if (collapsed) {
          qDiv.classList.add('collapsed');
        } else {
          qDiv.classList.remove('collapsed');
        }
        const btn = qDiv.querySelector('.question-header .collapse-btn');
        if (btn) btn.textContent = collapsed ? '▸' : '▾';
      }
    });
  });
}

/* ---------- Question type icons ---------- */
function getTypeIcon(type) {
  switch (type) {
    case 'mc': return '◉';
    case 'short': return '✎';
    case 'long': return '¶';
    default: return '❓';
  }
}
function updateQuestionHeaderIcons() {
  const questions = document.querySelectorAll('.question');
  questions.forEach(q => {
    const typeSelect = q.querySelector('.qType');
    if (!typeSelect) return;
    const type = typeSelect.value || 'short';
    const header = q.querySelector('.question-header-title');
    if (!header) return;
    let iconSpan = header.querySelector('.qTypeIcon');
    if (!iconSpan) {
      iconSpan = document.createElement('span');
      iconSpan.className = 'qTypeIcon';
      header.insertBefore(iconSpan, header.firstChild);
    }
    iconSpan.textContent = getTypeIcon(type) + ' ';
  });
}

/* ---------- Jump to question dropdown ---------- */
function buildJumpDropdown() {
  if (document.getElementById('jumpSelect')) return;
  const controls = document.querySelector('.controls');
  if (!controls) return;
  const select = document.createElement('select');
  select.id = 'jumpSelect';
  select.style.marginLeft = '12px';
  select.style.padding = '5px';
  select.style.fontSize = '13px';
  select.style.minWidth = '200px';
  select.innerHTML = '<option value="">Jump to question…</option>';
  select.onchange = function () {
    const val = this.value;
    if (!val) return;
    const targetInput = document.querySelector('.qId[value="' + val.replace(/"/g, '\\"') + '"]');
    const qDiv = targetInput ? targetInput.closest('.question') : null;
    if (qDiv) {
      qDiv.classList.remove('collapsed');
      const btn = qDiv.querySelector('.question-header .collapse-btn');
      if (btn) btn.textContent = '▾';
      qDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
      saveCollapseStates();
    }
    this.value = '';
  };
  controls.appendChild(select);
}

function updateJumpDropdown() {
  const select = document.getElementById('jumpSelect');
  if (!select) return;
  const oldOpts = Array.from(select.querySelectorAll('option')).slice(1);
  oldOpts.forEach(o => o.remove());
  const questions = document.querySelectorAll('.question');
  questions.forEach(q => {
    const idInput = q.querySelector('.qId');
    const textArea = q.querySelector('.qText');
    if (!idInput || !textArea) return;
    const id = idInput.value.trim();
    if (!id) return;
    const text = textArea.value.trim();
    const opt = document.createElement('option');
    opt.value = id;
    const snippet = text.length > 70 ? text.slice(0, 70) + '…' : text;
    opt.textContent = id + ' – ' + snippet;
    select.appendChild(opt);
  });
}

/* ---------- Dark mode toggle ---------- */
function addDarkModeToggle() {
  if (document.getElementById('darkToggle')) return;
  const controls = document.querySelector('.controls');
  if (!controls) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'darkToggle';
  btn.className = 'secondary-btn';
  btn.style.marginLeft = '12px';
  btn.textContent = 'Dark Mode';
  btn.onclick = function () {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    btn.textContent = isDark ? 'Light Mode' : 'Dark Mode';
    try {
      localStorage.setItem('bcats_darkmode', isDark ? 'true' : 'false');
    } catch (e) {}
  };
  controls.appendChild(btn);
  let stored = null;
  try {
    stored = localStorage.getItem('bcats_darkmode');
  } catch (e) {}
  if (stored === 'true') {
    document.body.classList.add('dark-mode');
    btn.textContent = 'Light Mode';
  }
}

/* ---------- Tester collapsible ---------- */
function makeTesterCollapsible() {
  const testers = document.querySelectorAll('.question-tester');
  testers.forEach(t => {
    if (t.querySelector('.tester-toggle')) return;
    const h4 = t.querySelector('h4');
    if (!h4) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tester-toggle secondary-btn';
    btn.style.cssText = 'float:right; font-size:11px; padding:2px 6px;';
    btn.textContent = '▼ Test';
    btn.onclick = function () {
      t.classList.toggle('collapsed');
      btn.textContent = t.classList.contains('collapsed') ? '▶ Test' : '▼ Test';
    };
    h4.appendChild(btn);
    t.classList.add('collapsed');
  });
}

// Helper to keep regex flags sane
function sanitizeFlags(flags) {
  const valid = (flags || "").replace(/[^gimsuy]/g, "");
  return [...new Set(valid.split(""))].join("");
}

// Get flags from a rubric row
function getFlagsForRow(row) {
  const select = row.querySelector('.rFlagsSelect');
  const flagsInput = row.querySelector('.rFlags');
  let flags;
  if (select) {
    if (select.value === 'custom') {
      flags = (flagsInput.value.trim() || 'i');
    } else {
      flags = select.value;
    }
  } else if (flagsInput) {
    flags = flagsInput.value.trim() || 'i';
  } else {
    flags = 'i';
  }
  return sanitizeFlags(flags || 'i');
}

// ---------- Collapse helpers ----------
function toggleSectionCollapse(btn) {
  const section = btn.closest('.section');
  if (!section) return;
  section.classList.toggle('collapsed');
  btn.textContent = section.classList.contains('collapsed') ? '▸' : '▾';
  saveCollapseStates();
}

function toggleQuestionCollapse(btn) {
  const q = btn.closest('.question');
  if (!q) return;
  q.classList.toggle('collapsed');
  btn.textContent = q.classList.contains('collapsed') ? '▸' : '▾';
  saveCollapseStates();
}

// Expand/collapse all assessments & questions
function expandAllSections() {
  const sections = document.querySelectorAll('#assessments > .section');
  sections.forEach(section => {
    section.classList.remove('collapsed');
    const sBtn = section.querySelector('.section-header .collapse-btn');
    if (sBtn) sBtn.textContent = '▾';
    const questions = section.querySelectorAll('.question');
    questions.forEach(q => {
      q.classList.remove('collapsed');
      const qBtn = q.querySelector('.question-header .collapse-btn');
      if (qBtn) qBtn.textContent = '▾';
    });
  });
  saveCollapseStates();
}

function collapseAllSections() {
  const sections = document.querySelectorAll('#assessments > .section');
  sections.forEach(section => {
    section.classList.add('collapsed');
    const sBtn = section.querySelector('.section-header .collapse-btn');
    if (sBtn) sBtn.textContent = '▸';
    const questions = section.querySelectorAll('.question');
    questions.forEach(q => {
      q.classList.add('collapsed');
      const qBtn = q.querySelector('.question-header .collapse-btn');
      if (qBtn) qBtn.textContent = '▸';
    });
  });
  saveCollapseStates();
}

// ---------- Drag & drop for questions ----------
function questionDragStart(e) {
  draggedQuestion = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', '');
}

function questionDragEnd(e) {
  this.classList.remove('dragging');
  document.querySelectorAll('.question.drop-target').forEach(el => el.classList.remove('drop-target'));
  draggedQuestion = null;
}

function questionDragOver(e) {
  e.preventDefault();
  if (!draggedQuestion) return;
  e.dataTransfer.dropEffect = 'move';

  const target = e.currentTarget;
  if (target === draggedQuestion) return;

  document.querySelectorAll('.question.drop-target').forEach(el => el.classList.remove('drop-target'));
  target.classList.add('drop-target');
}

function questionDrop(e) {
  e.preventDefault();
  const target = e.currentTarget;
  if (!draggedQuestion || draggedQuestion === target) return;

  const container = target.parentElement;
  const rect = target.getBoundingClientRect();
  const offset = e.clientY - rect.top;
  const halfway = rect.height / 2;

  if (offset > halfway) {
    container.insertBefore(draggedQuestion, target.nextSibling);
  } else {
    container.insertBefore(draggedQuestion, target);
  }

  target.classList.remove('drop-target');
  updateJumpDropdown();
  saveCollapseStates();
}

function questionDragLeave(e) {
  e.currentTarget.classList.remove('drop-target');
}

function makeQuestionDraggable(qDiv) {
  qDiv.setAttribute('draggable', 'true');
  qDiv.addEventListener('dragstart', questionDragStart);
  qDiv.addEventListener('dragend', questionDragEnd);
  qDiv.addEventListener('dragover', questionDragOver);
  qDiv.addEventListener('drop', questionDrop);
  qDiv.addEventListener('dragleave', questionDragLeave);
}

// ---------- Drag & drop for MC options ----------
function optionDragStart(e) {
  draggedOption = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', '');
}

function optionDragEnd(e) {
  this.classList.remove('dragging');
  const rows = document.querySelectorAll('.option-row.drop-target');
  rows.forEach(r => r.classList.remove('drop-target'));
  draggedOption = null;
}

function optionDragOver(e) {
  e.preventDefault();
  if (!draggedOption) return;
  e.dataTransfer.dropEffect = 'move';

  const target = e.currentTarget;
  if (target === draggedOption) return;

  const rows = target.parentElement.querySelectorAll('.option-row.drop-target');
  rows.forEach(r => r.classList.remove('drop-target'));
  target.classList.add('drop-target');
}

function optionDrop(e) {
  e.preventDefault();
  const target = e.currentTarget;
  if (!draggedOption || draggedOption === target) return;

  const container = target.parentElement;
  const rect = target.getBoundingClientRect();
  const offset = e.clientY - rect.top;
  const halfway = rect.height / 2;

  if (offset > halfway) {
    container.insertBefore(draggedOption, target.nextSibling);
  } else {
    container.insertBefore(draggedOption, target);
  }

  target.classList.remove('drop-target');
  autosave();
}

function optionDragLeave(e) {
  e.currentTarget.classList.remove('drop-target');
}

function makeOptionDraggable(rowDiv) {
  rowDiv.setAttribute('draggable', 'true');
  rowDiv.addEventListener('dragstart', optionDragStart);
  rowDiv.addEventListener('dragend', optionDragEnd);
  rowDiv.addEventListener('dragover', optionDragOver);
  rowDiv.addEventListener('drop', optionDrop);
  rowDiv.addEventListener('dragleave', optionDragLeave);
}

// ---------- Randomise MC option order ----------
function randomizeOptions(container) {
  if (!container) return;
  const rows = Array.from(container.querySelectorAll('.option-row'));
  if (rows.length < 2) return;

  for (let i = rows.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = rows[i];
    rows[i] = rows[j];
    rows[j] = tmp;
  }

  rows.forEach(row => container.appendChild(row));
  autosave();
}

// ---------- Teachers ----------
function addTeacher(t = null) {
  const div = document.createElement('div');
  div.className = 'teacher';
  div.innerHTML = `
    <span class="remove" onclick="this.parentElement.remove(); autosave();">✖</span>
    <label>ID <input type="text" class="tId" value="${t ? (t.id || '') : ''}"></label>
    <label>Name <input type="text" class="tName" value="${t ? (t.name || '') : ''}"></label>
    <label>Email <input type="text" class="tEmail" value="${t ? (t.email || '') : ''}"></label>
  `;
  document.getElementById('teachers').appendChild(div);
  autosave();
}

function collectTeachers() {
  data.TEACHERS = Array.from(document.querySelectorAll('.teacher')).map(d => ({
    id: d.querySelector('.tId').value.trim(),
    name: d.querySelector('.tName').value.trim(),
    email: d.querySelector('.tEmail').value.trim()
  }));
}

// ---------- Assessments & Questions ----------
function addAssessment(a = null) {
  const div = document.createElement('div');
  div.className = 'section collapsed';
  const titleText = a ? (a.title || a.id || 'Assessment') : 'New Assessment';

  div.innerHTML = `
    <div class="section-header">
      <button type="button" class="collapse-btn" onclick="toggleSectionCollapse(this)">▸</button>
      <span class="section-header-title">Assessment – <span class="assHeaderTitle">${titleText}</span></span>
      <span style="margin-left:auto; display:flex; gap:6px; align-items:center;">
        <button type="button" class="secondary-btn" onclick="duplicateAssessment(this)">Duplicate</button>
        <span class="remove" onclick="this.closest('.section').remove(); saveCollapseStates(); autosave();">✖</span>
      </span>
    </div>
    <div class="section-body">
      <label>Assessment ID <input type="text" class="assId" value="${a ? (a.id || '') : ''}"></label>
      <label>Title <input type="text" class="assTitle" value="${a ? (a.title || '') : ''}"></label>
      <label>Subtitle <input type="text" class="assSubtitle" value="${a ? (a.subtitle || '') : ''}"></label>
      <label>US Number <input type="text" class="assUSNumber" value="${a ? (a.usNumber || '') : ''}"></label>
      <label>US Version <input type="text" class="assUSVersion" value="${a ? (a.usVersion || '') : ''}"></label>
      <label>Credits <input type="number" class="assCredits" value="${a && a.credits != null ? a.credits : ''}"></label>
      <label>Standard Type
        <select class="assType">
          <option value="">(optional)</option>
          <option value="internal" ${a && a.standardType === 'internal' ? 'selected' : ''}>Internal</option>
          <option value="external" ${a && a.standardType === 'external' ? 'selected' : ''}>External</option>
        </select>
      </label>
      <div class="questions"></div>
      <button type="button" class="add-btn" onclick="addQuestion(this.closest('.section').querySelector('.questions'))">+ Add Question</button>
    </div>
  `;
  document.getElementById('assessments').appendChild(div);

  const titleInput = div.querySelector('.assTitle');
  const headerTitleEl = div.querySelector('.assHeaderTitle');
  const idInput = div.querySelector('.assId');
  function syncHeader() {
    headerTitleEl.textContent = titleInput.value || idInput.value || 'Assessment';
    saveCollapseStates();
    autosave();
  }
  titleInput.addEventListener('input', syncHeader);
  idInput.addEventListener('input', syncHeader);

  if (a && a.questions) a.questions.forEach(q => addQuestion(div.querySelector('.questions'), q));

  div.querySelectorAll('.question').forEach(q => makeQuestionDraggable(q));

  updateQuestionHeaderIcons();
  makeTesterCollapsible();
  updateJumpDropdown();
  saveCollapseStates();
  autosave();
}

function duplicateAssessment(btn) {
  const assDiv = btn.closest('.section');
  const container = document.getElementById('assessments');
  const clone = assDiv.cloneNode(true);
  clone.classList.add('collapsed');
  const idInput = clone.querySelector('.assId');
  const headerTitleEl = clone.querySelector('.assHeaderTitle');
  const collapseBtn = clone.querySelector('.section-header .collapse-btn');

  if (idInput) idInput.value = (idInput.value || '') + '_copy';
  if (headerTitleEl && idInput) headerTitleEl.textContent = idInput.value || headerTitleEl.textContent;
  if (collapseBtn) collapseBtn.textContent = '▸';

  const titleInput = clone.querySelector('.assTitle');
  function syncHeaderClone() {
    headerTitleEl.textContent = (titleInput && titleInput.value) || (idInput && idInput.value) || 'Assessment';
    saveCollapseStates();
    autosave();
  }
  if (titleInput) titleInput.addEventListener('input', syncHeaderClone);
  if (idInput) idInput.addEventListener('input', syncHeaderClone);

  clone.querySelectorAll('.question').forEach(q => makeQuestionDraggable(q));

  container.insertBefore(clone, assDiv.nextSibling);

  updateQuestionHeaderIcons();
  makeTesterCollapsible();
  updateJumpDropdown();
  saveCollapseStates();
  autosave();
}

// ---------- Questions ----------
function addQuestion(container, q = null) {
  const div = document.createElement('div');
  div.className = 'question collapsed';

  const qIdVal = q ? (q.id || '') : '';
  const headerLabel = qIdVal || 'New question';

  div.innerHTML = `
    <div class="question-header">
      <button type="button" class="collapse-btn" onclick="toggleQuestionCollapse(this)">▸</button>
      <span class="question-header-title">Question – <span class="qHeaderTitle">${headerLabel}</span></span>
      <span style="margin-left:auto; display:flex; gap:6px; align-items:center;">
        <button type="button" class="secondary-btn" onclick="duplicateQuestion(this)">Duplicate</button>
        <span class="remove" onclick="this.closest('.question').remove(); saveCollapseStates(); autosave();">✖</span>
      </span>
    </div>
    <div class="question-body">
      <label>Question ID <input type="text" class="qId" value="${q ? (q.id || '') : ''}"></label>
      <label>Text (you can use \\n for line breaks)<br>
        <textarea class="qText">${q ? (q.text || '') : ''}</textarea></label>

      <label>Image filename (or blank.jpg)
        <input type="text" class="qImage" value="${q ? (q.image || 'blank.jpg') : 'blank.jpg'}">
        <div class="image-filename-note">This will be written into the JSON. Make sure it matches the actual file name in your images folder.</div>
      </label>
      <div class="image-drop"
          onclick="imageDropClick(this)"
          ondragover="handleImageDragOver(event)"
          ondragleave="handleImageDragLeave(event)"
          ondrop="handleImageDrop(event)">
        <span>📷 Drag a photo here or click to choose a file</span>
        <input type="file" accept="image/*" class="qImageFile" style="display:none" onchange="handleImageFileSelect(this)">
      </div>

      <label>Hint <input type="text" class="qHint" value="${q ? (q.hint || '') : ''}"></label>
      <label>Type 
        <select class="qType" onchange="toggleOptionsRubric(this); updateQuestionHeaderIcons(); autosave();">
          <option value="mc" ${q && q.type === 'mc' ? 'selected' : ''}>Multiple Choice (mc)</option>
          <option value="short" ${q && q.type === 'short' ? 'selected' : ''}>Short answer</option>
          <option value="long" ${q && q.type === 'long' ? 'selected' : ''}>Long answer</option>
        </select>
      </label>
      <label>Max Points <input type="number" class="qPoints" value="${q ? (q.maxPoints || 1) : 1}"></label>

      <div class="options" style="display:block">
        <h4>Options</h4>
        <div class="option-list"></div>
        <button type="button" class="add-btn"
                onclick="addOptionRow(this.closest('.options').querySelector('.option-list'))">
          + Add Option
        </button>
        <button type="button" class="secondary-btn"
                onclick="randomizeOptions(this.closest('.options').querySelector('.option-list'))">
          Randomise order
        </button>
      </div>

      <div class="rubric" style="display:block">
        <h4>Auto-grading Rubric</h4>
        <div class="rubric-list"></div>
        <button type="button" class="add-btn" onclick="addRubricRow(this.closest('.rubric').querySelector('.rubric-list'))">+ Add Rubric Rule</button>
      </div>

      <div class="question-tester">
        <h4>Test this question with a sample answer</h4>
        <div class="tester-body">
          <textarea class="qSample" placeholder="Paste a student answer here"></textarea>
          <button type="button" class="secondary-btn" onclick="testQuestionSample(this.closest('.question'))">Test full question</button>
          <div class="qTestResult"></div>
        </div>
      </div>
    </div>
  `;
  container.appendChild(div);

  makeQuestionDraggable(div);

  const optContainer = div.querySelector('.option-list');
  if (q && q.type === 'mc' && Array.isArray(q.options)) {
    let correctIndex = -1;
    if (q.rubric && q.rubric.length > 0 && q.rubric[0].check) {
      const pattern = q.rubric[0].check.toLowerCase();
      correctIndex = q.options.findIndex(o => pattern.indexOf(String(o || '').toLowerCase()) !== -1);
    }
    q.options.forEach((optText, idx) => {
      addOptionRow(optContainer, {
        text: optText,
        correct: idx === correctIndex
      });
    });
  } else if (!q) {
    addOptionRow(optContainer);
  }

  const rubricList = div.querySelector('.rubric-list');
  if (q && q.rubric && q.type !== 'mc') {
    q.rubric.forEach(r => addRubricRow(rubricList, r));
  } else if (!q || (q && q.type !== 'mc')) {
    addRubricRow(rubricList);
  }

  const select = div.querySelector('.qType');
  toggleOptionsRubric(select);

  const qText = div.querySelector('.qText');
  const qIdInput = div.querySelector('.qId');
  const headerTitleEl = div.querySelector('.qHeaderTitle');

  qText.addEventListener('blur', function () {
    suggestQuestionId(div);
    updateJumpDropdown();
    saveCollapseStates();
    autosave();
  });
  qIdInput.addEventListener('input', function () {
    headerTitleEl.textContent = qIdInput.value || 'Question';
    updateJumpDropdown();
    saveCollapseStates();
    autosave();
  });

  updateQuestionHeaderIcons();
  makeTesterCollapsible();
  updateJumpDropdown();
  saveCollapseStates();
  autosave();
}

function duplicateQuestion(btn) {
  const qDiv = btn.closest('.question');
  const container = qDiv.parentElement;
  const clone = qDiv.cloneNode(true);
  clone.classList.add('collapsed');
  const idInput = clone.querySelector('.qId');
  const headerTitleEl = clone.querySelector('.qHeaderTitle');
  const collapseBtn = clone.querySelector('.question-header .collapse-btn');

  if (idInput) idInput.value = (idInput.value || '') + '_copy';
  if (headerTitleEl && idInput) headerTitleEl.textContent = idInput.value || headerTitleEl.textContent;
  if (collapseBtn) collapseBtn.textContent = '▸';

  const qIdInput = clone.querySelector('.qId');
  if (qIdInput && headerTitleEl) {
    qIdInput.addEventListener('input', function () {
      headerTitleEl.textContent = qIdInput.value || 'Question';
      updateJumpDropdown();
      saveCollapseStates();
      autosave();
    });
  }

  clone.querySelectorAll('.option-row').forEach(row => makeOptionDraggable(row));

  makeQuestionDraggable(clone);
  container.insertBefore(clone, qDiv.nextSibling);

  updateQuestionHeaderIcons();
  makeTesterCollapsible();
  updateJumpDropdown();
  saveCollapseStates();
  autosave();
}

function suggestQuestionId(qDiv) {
  const idInput = qDiv.querySelector('.qId');
  if (!idInput || idInput.value.trim()) return;
  const text = qDiv.querySelector('.qText').value || '';
  let base = text.toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  if (!base) base = 'q' + Date.now();
  idInput.value = base;
  const headerTitleEl = qDiv.querySelector('.qHeaderTitle');
  if (headerTitleEl) headerTitleEl.textContent = base;
}

function toggleOptionsRubric(select) {
  const qDiv = select.closest('.question');
  const isMc = select.value === 'mc';
  const optionsDiv = qDiv.querySelector('.options');
  const rubricDiv = qDiv.querySelector('.rubric');
  if (optionsDiv) optionsDiv.style.display = isMc ? 'block' : 'none';
  if (rubricDiv) rubricDiv.style.display = isMc ? 'none' : 'block';
}

// ---------- Image drag/drop + file ----------
function imageDropClick(dropDiv) {
  const fileInput = dropDiv.querySelector('.qImageFile');
  if (fileInput) fileInput.click();
}

function handleImageFileSelect(input) {
  const file = input.files[0];
  if (!file) return;
  const qDiv = input.closest('.question');
  if (!qDiv) return;
  const imgInput = qDiv.querySelector('.qImage');
  if (imgInput) {
    imgInput.value = file.name;
    autosave();
  }
}

function handleImageDragOver(event) {
  event.preventDefault();
  const dropDiv = event.currentTarget;
  dropDiv.classList.add('dragover');
}

function handleImageDragLeave(event) {
  event.preventDefault();
  const dropDiv = event.currentTarget;
  dropDiv.classList.remove('dragover');
}

function handleImageDrop(event) {
  event.preventDefault();
  const dropDiv = event.currentTarget;
  dropDiv.classList.remove('dragover');
  const files = event.dataTransfer.files;
  if (!files || !files.length) return;
  const file = files[0];
  const qDiv = dropDiv.closest('.question');
  if (!qDiv) return;
  const imgInput = qDiv.querySelector('.qImage');
  if (imgInput) {
    imgInput.value = file.name;
    autosave();
  }
}

// ---------- Options (MC answers) ----------
function addOptionRow(container, opt = null) {
  const div = document.createElement('div');
  div.className = 'option-row';
  const textVal = opt ? (opt.text || opt) : '';
  const checked = opt && opt.correct ? 'checked' : '';
  div.innerHTML = `
    <span class="remove" onclick="this.parentElement.remove(); autosave();">✖</span>
    <label>Option text
      <input type="text" class="optText" value="${textVal}">
    </label>
    <label>
      <input type="checkbox" class="optCorrect" ${checked}>
      Correct answer
    </label>
  `;
  container.appendChild(div);
  makeOptionDraggable(div);
}

// ---------- Flags explanation helper ----------
function updateFlagExplanation(selectEl) {
  const row = selectEl.closest('.rubric-row');
  const textInput = row.querySelector('.rFlags');
  const explanation = row.querySelector('.flagExplanation');
  const value = selectEl.value;

  if (value === "custom") {
    textInput.style.display = "block";
    if (!textInput.value.trim()) {
      textInput.value = "";
    }
  } else {
    textInput.style.display = "none";
    textInput.value = value;
  }

  switch (value) {
    case "i":
      explanation.textContent = "Matches answers regardless of UPPER/lower case.";
      break;
    case "im":
      explanation.textContent = "Multi-line mode: ^ and $ match each line. Case is ignored.";
      break;
    case "is":
      explanation.textContent = "Dot-all: .* can span across line breaks. Case is ignored.";
      break;
    case "":
      explanation.textContent = "Case-sensitive exact match. Rarely needed for student answers.";
      break;
    case "custom":
      explanation.textContent = "Advanced: enter flags manually (e.g. im, ig, ims).";
      break;
    default:
      explanation.textContent = "";
  }
}

// Update preview text for a rubric row
function updateRubricPreview(row) {
  const preview = row.querySelector('.rPreview');
  if (!preview) return;

  const easy = row.querySelector('.rEasy')?.value.trim() || '';
  const adv = row.querySelector('.rCheck')?.value.trim() || '';

  if (adv) {
    preview.textContent = `Using advanced regex: ${adv}`;
  } else if (easy) {
    const parts = easy.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length) {
      preview.textContent = 'Will match if the answer contains any of: ' + parts.join('; ');
    } else {
      preview.textContent = '';
    }
  } else {
    preview.textContent = '';
  }
}

// ---------- Rubric rows (layman-friendly) ----------
function addRubricRow(container, r = null) {
  const div = document.createElement('div');
  div.className = 'rubric-row';
  div.innerHTML = `
    <span class="remove" onclick="this.parentElement.remove(); autosave();">✖</span>

    <label>Points (for this rule)
      <input type="number" class="rPoints" value="${r ? (r.points || 1) : 1}">
    </label>

    <label>Keywords/phrases (matches if ANY are mentioned)
      <input type="text" class="rEasy" placeholder="e.g. eye injury, blindness, flying particles">
    </label>

    <label>Advanced regex (optional – use instead of keywords)
      <input type="text" class="rCheck" value="${r ? (r.check || '') : ''}"></label>

    <label>Flags (how matching works)</label>
    <select class="rFlagsSelect" onchange="updateFlagExplanation(this); autosave();">
      <option value="i" selected>Ignore case (recommended)</option>
      <option value="im">Ignore case + multi-line (^ matches each line)</option>
      <option value="is">Ignore case + dot-all (.* across lines)</option>
      <option value="">Exact matching (case-sensitive)</option>
      <option value="custom">Custom (advanced)</option>
    </select>

    <input type="text" class="rFlags" style="display:none" placeholder="Enter flags e.g. im">

    <div class="flagExplanation" style="font-size:11px; color:#555; margin-top:4px;">
      Matches answers regardless of UPPER/lower case.
    </div>

    <label>Preview
      <div class="rPreview" style="font-size:11px; color:#555; min-height:1em;"></div>
    </label>
  `;
  container.appendChild(div);

  const select = div.querySelector('.rFlagsSelect');
  const flagsInput = div.querySelector('.rFlags');
  let flags = r && r.flags !== undefined ? r.flags : 'i';

  if (flags === 'i' || flags === 'im' || flags === 'is' || flags === '') {
    select.value = flags;
    flagsInput.value = flags;
    flagsInput.style.display = 'none';
  } else {
    select.value = 'custom';
    flagsInput.value = flags;
    flagsInput.style.display = 'block';
  }
  updateFlagExplanation(select);

  const easyInput = div.querySelector('.rEasy');
  const advInput = div.querySelector('.rCheck');
  easyInput.addEventListener('input', () => { updateRubricPreview(div); autosave(); });
  advInput.addEventListener('input', () => { updateRubricPreview(div); autosave(); });
  updateRubricPreview(div);
}

// Count keyword matches for stats
function countKeywordMatches(row, sample, flags) {
  const easyInputEl = row.querySelector('.rEasy');
  if (!easyInputEl) return { hits: 0, total: 0 };
  const easyInput = easyInputEl.value.trim();
  if (!easyInput) return { hits: 0, total: 0 };

  const parts = easyInput.split(',').map(s => s.trim()).filter(Boolean);
  if (!parts.length) return { hits: 0, total: 0 };

  const cleanFlags = sanitizeFlags(flags || 'i');
  let hits = 0;

  parts.forEach(p => {
    const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try {
      const re = new RegExp(escaped, cleanFlags);
      if (re.test(sample)) hits++;
    } catch (e) {
      // ignore bad keyword pattern
    }
  });

  return { hits, total: parts.length };
}

// ---------- Test full question (score + keyword matches) ----------
function testQuestionSample(qDiv) {
  const sampleEl = qDiv.querySelector('.qSample');
  const resultEl = qDiv.querySelector('.qTestResult');
  const sample = (sampleEl.value || '').trim();

  if (!sample) {
    resultEl.textContent = 'Please paste or type a sample answer first.';
    return;
  }

  const type = qDiv.querySelector('.qType').value;
  const maxPointsField = parseInt(qDiv.querySelector('.qPoints').value) || 1;
  let totalScore = 0;
  let details = [];

  if (type === 'mc') {
    const optRows = Array.from(qDiv.querySelectorAll('.option-row'));
    const correctRow = optRows.find(r => r.querySelector('.optCorrect').checked);

    if (!correctRow) {
      resultEl.textContent = 'No correct option selected for this multiple-choice question.';
      return;
    }

    const correctText = correctRow.querySelector('.optText').value.trim();
    if (!correctText) {
      resultEl.textContent = 'Correct option has no text.';
      return;
    }

    const escaped = correctText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    try {
      const re = new RegExp(escaped, 'i');
      const hit = re.test(sample);
      totalScore = hit ? maxPointsField : 0;

      details.push(
        hit
          ? 'Matched correct option text: "' + correctText + '".'
          : 'Did not find the exact correct option text. Sample must contain:\n"' + correctText + '".'
      );
    } catch (e) {
      resultEl.textContent = 'Error in auto-generated pattern for MC: ' + e.message;
      return;
    }

    resultEl.textContent =
      'Score for this sample: ' + totalScore + ' / ' + maxPointsField + '.\n' +
      details.join(' ');
    return;
  }

  const rows = Array.from(qDiv.querySelectorAll('.rubric-row'));
  if (!rows.length) {
    resultEl.textContent = 'No rubric rules defined for this question.';
    return;
  }

  let maxRubricPoints = 0;
  let totalKeywords = 0;
  let totalKeywordHits = 0;

  rows.forEach((row, idx) => {
    const pts = parseInt(row.querySelector('.rPoints').value) || 1;
    const adv = row.querySelector('.rCheck').value.trim();
    const easyInput = row.querySelector('.rEasy').value.trim();
    const flags = getFlagsForRow(row);

    if (adv) {
      maxRubricPoints += pts;
      try {
        const re = new RegExp(adv, flags);
        const match = re.test(sample);
        if (match) {
          totalScore += pts;
          details.push('Rule ' + (idx + 1) + ': ✅ advanced regex matched (+' + pts + ').');
        } else {
          details.push('Rule ' + (idx + 1) + ': ❌ advanced regex did not match.');
        }
      } catch (e) {
        details.push('Rule ' + (idx + 1) + ': ⚠ invalid advanced regex (' + e.message + ').');
      }

      if (easyInput) {
        const kw = countKeywordMatches(row, sample, flags);
        if (kw.total) {
          totalKeywords += kw.total;
          totalKeywordHits += kw.hits;
          details[details.length - 1] += ' Keywords matched ' + kw.hits + '/' + kw.total + '.';
        }
      }
    } else if (easyInput) {
      const parts = easyInput.split(',').map(s => s.trim()).filter(Boolean);
      if (parts.length) {
        const escapedParts = parts.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const pattern = '(?:' + escapedParts.join('|') + ')';

        try {
          const re = new RegExp(pattern, flags);
          const match = re.test(sample);
          maxRubricPoints += pts;

          if (match) {
            totalScore += pts;
            details.push(
              'Rule ' + (idx + 1) + ': ✅ matched at least one of [' + parts.join(', ') + '] (+' + pts + ').'
            );
          } else {
            details.push(
              'Rule ' + (idx + 1) + ': ❌ none of [' + parts.join(', ') + '] were found.'
            );
          }

          const kw = countKeywordMatches(row, sample, flags);
          if (kw.total) {
            totalKeywords += kw.total;
            totalKeywordHits += kw.hits;
            details[details.length - 1] += ' Keywords matched ' + kw.hits + '/' + kw.total + '.';
          }
        } catch (e) {
          details.push(
            'Rule ' + (idx + 1) + ': ⚠ invalid generated regex from keywords (' + e.message + ').'
          );
        }
      } else {
        details.push('Rule ' + (idx + 1) + ': no keywords defined.');
      }
    } else {
      details.push('Rule ' + (idx + 1) + ': skipped (no keywords or regex).');
    }
  });

  let summary =
    'Score for this sample based on rubric: ' +
    totalScore + ' / ' + (maxRubricPoints || 0) + '.';

  if (totalKeywords > 0) {
    summary += '\nTotal keyword matches (for info only): ' +
      totalKeywordHits + ' / ' + totalKeywords + ' across all rules.';
  }

  resultEl.textContent = summary + '\n' + details.join(' ');
}

// ---------- Collect everything ----------
function collectAll() {
  data.APP_ID = document.getElementById('appId').value.trim();
  data.VERSION = document.getElementById('version').value.trim();
  data.APP_TITLE = document.getElementById('appTitle').value.trim();
  data.APP_SUBTITLE = document.getElementById('appSubtitle').value.trim();
  data.DEADLINE = data.DEADLINE || {};
  data.DEADLINE.day = parseInt(document.getElementById('deadlineDay').value) || 1;
  data.DEADLINE.month = parseInt(document.getElementById('deadlineMonth').value) || 1;
  data.DEADLINE.label = document.getElementById('deadlineLabel').value.trim();

  collectTeachers();

  data.ASSESSMENTS = Array.from(document.querySelectorAll('#assessments > .section')).map(assDiv => {
    const questions = Array.from(assDiv.querySelectorAll('.question')).map(qDiv => {
      const type = qDiv.querySelector('.qType').value;
      const maxPoints = parseInt(qDiv.querySelector('.qPoints').value) || 1;

      const question = {
        id: qDiv.querySelector('.qId').value.trim(),
        text: qDiv.querySelector('.qText').value.replace(/\n/g, '\n'),
        image: qDiv.querySelector('.qImage').value.trim() || "blank.jpg",
        hint: qDiv.querySelector('.qHint').value.trim(),
        type: type,
        maxPoints: maxPoints,
        rubric: []
      };

      if (type === 'mc') {
        const optRows = Array.from(qDiv.querySelectorAll('.option-row'));
        const options = optRows
          .map(r => r.querySelector('.optText').value.trim())
          .filter(o => o);
        question.options = options;

        const correctRow = optRows.find(r => r.querySelector('.optCorrect').checked);
        if (correctRow) {
          const correctText = correctRow.querySelector('.optText').value.trim();
          if (correctText) {
            const escaped = correctText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            question.rubric = [{
              points: maxPoints,
              check: escaped,
              flags: 'i'
            }];
          }
        }
      } else {
        const rubric = [];
        const rows = Array.from(qDiv.querySelectorAll('.rubric-row'));
        rows.forEach(row => {
          const pts = parseInt(row.querySelector('.rPoints').value) || 1;
          const adv = row.querySelector('.rCheck').value.trim();
          const easyInput = row.querySelector('.rEasy').value.trim();
          const flags = getFlagsForRow(row);

          if (adv) {
            rubric.push({ points: pts, check: adv, flags });
          } else if (easyInput) {
            const parts = easyInput.split(',').map(s => s.trim()).filter(Boolean);
            if (parts.length) {
              const escapedParts = parts.map(p =>
                p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
              );
              const alternation = '(?:' + escapedParts.join('|') + ')';
              rubric.push({
                points: pts,
                check: alternation,
                flags
              });
            }
          }
        });
        question.rubric = rubric.filter(r => r.check);
      }

      return question;
    });

    return {
      id: assDiv.querySelector('.assId').value.trim(),
      title: assDiv.querySelector('.assTitle').value.trim(),
      subtitle: assDiv.querySelector('.assSubtitle').value.trim(),
      usNumber: assDiv.querySelector('.assUSNumber') ? assDiv.querySelector('.assUSNumber').value.trim() : '',
      usVersion: assDiv.querySelector('.assUSVersion') ? assDiv.querySelector('.assUSVersion').value.trim() : '',
      credits: (() => {
        const v = assDiv.querySelector('.assCredits') ? assDiv.querySelector('.assCredits').value : '';
        return v === '' ? null : (parseInt(v) || null);
      })(),
      standardType: assDiv.querySelector('.assType') ? assDiv.querySelector('.assType').value : '',
      questions: questions
    };
  });
}

// ---------- Validation ----------
function validateData(d) {
  const errors = [];
  if (!d.APP_ID) errors.push('APP_ID is empty.');
  if (!d.VERSION) errors.push('VERSION is empty.');

  if (!d.ASSESSMENTS || !d.ASSESSMENTS.length) {
    errors.push('No assessments defined.');
    return errors;
  }

  d.ASSESSMENTS.forEach((ass, ai) => {
    const aLabel = ass.title || ass.id || ('Assessment ' + (ai + 1));
    if (!ass.id) errors.push(aLabel + ': Assessment ID is empty.');
    if (!ass.questions || !ass.questions.length) {
      errors.push(aLabel + ': has no questions.');
      return;
    }
    ass.questions.forEach((q, qi) => {
      const qLabel = (aLabel + ' / ' + (q.id || ('Question ' + (qi + 1))));
      if (!q.id) errors.push(qLabel + ': Question ID is empty.');
      if (q.type === 'mc') {
        if (!q.options || !q.options.length) {
          errors.push(qLabel + ': MC question has no options.');
        }
        if (!q.rubric || !q.rubric.length) {
          errors.push(qLabel + ': MC question has no correct answer selected.');
        }
      } else {
        if (!q.rubric || !q.rubric.length) {
          errors.push(qLabel + ': has no rubric rules.');
        }
      }
    });
  });

  return errors;
}

// ---------- Generate & Download JSON ----------
function generateJSON() {
  collectAll();
  const errors = validateData(data);
  if (errors.length) {
    alert("Please fix these issues before downloading:\n\n" + errors.join("\n"));
    return;
  }
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (data.APP_ID || 'quiz') + '_v' + (data.VERSION || '') + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- Autosave ----------
function autosave() {
  if (isLoading) return;
  try {
    collectAll();
    localStorage.setItem('bcats_quiz_builder_draft', JSON.stringify(data));
  } catch (e) {
    console.warn('Autosave failed', e);
  }
}

document.addEventListener('input', () => {
  autosave();
  setTimeout(updateJumpDropdown, 300);
});
document.addEventListener('change', () => {
  autosave();
  updateJumpDropdown();
});

// ---------- Clear draft ----------
function clearDraft() {
  if (confirm('Clear saved draft and reset the builder?')) {
    localStorage.removeItem('bcats_quiz_builder_draft');
    localStorage.removeItem('bcats_collapse_states');
    location.reload();
  }
}

// ---------- Load JSON from file ----------
function loadJSONFile() {
  const input = document.getElementById('jsonFile');
  const file = input.files[0];
  if (!file) {
    alert('Please choose a JSON file first.');
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const obj = JSON.parse(e.target.result);
      loadFromData(obj);
      localStorage.removeItem('bcats_collapse_states');
      saveCollapseStates();
    } catch (err) {
      console.error(err);
      alert('Invalid JSON file.');
    }
  };
  reader.readAsText(file);
}

// ---------- Populate UI from data ----------
function loadFromData(obj) {
  if (!obj || typeof obj !== 'object') {
    alert('JSON does not look like a quiz data object.');
    return;
  }

  isLoading = true;
  data = obj;

  document.getElementById('appId').value = obj.APP_ID || '';
  document.getElementById('version').value = obj.VERSION || '';
  document.getElementById('appTitle').value = obj.APP_TITLE || '';
  document.getElementById('appSubtitle').value = obj.APP_SUBTITLE || '';

  const deadline = obj.DEADLINE || {};
  document.getElementById('deadlineDay').value = deadline.day || 1;
  document.getElementById('deadlineMonth').value = deadline.month || 1;
  document.getElementById('deadlineLabel').value = deadline.label || '';

  const tContainer = document.getElementById('teachers');
  tContainer.innerHTML = '';
  (obj.TEACHERS || []).forEach(t => addTeacher(t));

  const aContainer = document.getElementById('assessments');
  aContainer.innerHTML = '';
  (obj.ASSESSMENTS || []).forEach(a => addAssessment(a));

  document.querySelectorAll('.question').forEach(q => makeQuestionDraggable(q));

  document.querySelectorAll('.option-row').forEach(row => makeOptionDraggable(row));

  updateQuestionHeaderIcons();
  makeTesterCollapsible();
  updateJumpDropdown();
  isLoading = false;
  saveCollapseStates();
}

// ---------- Initial setup / restore draft ----------
(function init() {
  const draft = localStorage.getItem('bcats_quiz_builder_draft');
  if (draft) {
    try {
      const obj = JSON.parse(draft);
      loadFromData(obj);
    } catch (e) {
      console.warn('Could not load draft, starting fresh.');
      addTeacher({id:"RY", name:"Mr Reynolds", email:"ry@pukekohehigh.school.nz"});
      addTeacher({id:"RNR", name:"Mr Ranson", email:"rnr@pukekohehigh.school.nz"});
      addTeacher({id:"Other", name:"Other Teacher", email:"technology@pukekohehigh.school.nz"});
      addAssessment();
    }
  } else {
    addTeacher({id:"RY", name:"Mr Reynolds", email:"ry@pukekohehigh.school.nz"});
    addTeacher({id:"RNR", name:"Mr Ranson", email:"rnr@pukekohehigh.school.nz"});
    addTeacher({id:"Other", name:"Other Teacher", email:"technology@pukekohehigh.school.nz"});
    addAssessment();
  }

  buildJumpDropdown();
  addDarkModeToggle();
  updateQuestionHeaderIcons();
  makeTesterCollapsible();
  updateJumpDropdown();
  restoreCollapseStates();
})();

// ---------- PWA: service worker registration ----------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(err => {
      console.log('Service worker registration failed:', err);
    });
  });
}
