/* ============================================================
   Générateur d'interfaces — Form Builder (Vanilla JS)
   ============================================================ */

/* ---------- Catalogue des types de champs ---------- */
const FIELD_TYPES = {
  text:     { label: 'Texte court',   icon: '✏️', badge: 'Texte court',   hasPlaceholder: true },
  textarea: { label: 'Texte long',    icon: '📝', badge: 'Texte long',    hasPlaceholder: true },
  number:   { label: 'Nombre',        icon: '🔢', badge: 'Nombre',        hasPlaceholder: true },
  email:    { label: 'E-mail',        icon: '✉️', badge: 'E-mail',        hasPlaceholder: true },
  tel:      { label: 'Téléphone',     icon: '📞', badge: 'Téléphone',     hasPlaceholder: true },
  date:     { label: 'Date',          icon: '📅', badge: 'Date',          hasPlaceholder: false },
  select:   { label: 'Liste déroul.', icon: '🔽', badge: 'Liste déroulante', hasOptions: true },
  radio:    { label: 'Choix unique',  icon: '⚪', badge: 'Choix unique',  hasOptions: true },
  checkbox: { label: 'Choix multiple',icon: '☑️', badge: 'Choix multiple',hasOptions: true },
  consent:  { label: 'Case à cocher', icon: '✅', badge: 'Consentement',  hasPlaceholder: false },
  file:     { label: 'Fichier',       icon: '📎', badge: 'Fichier (drag & drop)', hasPlaceholder: false },
  heading:  { label: 'Titre section', icon: '𝐇',  badge: 'Titre de section', hasPlaceholder: false, noRequired: true },
  submit:   { label: 'Bouton envoi',  icon: '🚀', badge: 'Bouton d\'envoi', hasPlaceholder: false, noRequired: true, singleton: true },
};

/* ---------- État ---------- */
let state = {
  id: null,
  title: 'Mon formulaire',
  description: '',
  fields: [],
};
let currentMode = 'edit';
let uid = () => 'f' + Math.random().toString(36).slice(2, 9);

const LS_CURRENT = 'ig_current_form';
const LS_LIBRARY = 'ig_form_library';

/* ---------- Raccourcis DOM ---------- */
const $ = (sel) => document.querySelector(sel);
const canvas = $('#canvas');
const emptyState = $('#empty-state');

/* ============================================================
   Initialisation
   ============================================================ */
function init() {
  buildPalette();
  bindTopbar();
  bindMeta();
  loadCurrentFromStorage();
  render();
}

/* ---------- Palette ---------- */
function buildPalette() {
  const list = $('#palette-list');
  list.innerHTML = '';
  Object.entries(FIELD_TYPES).forEach(([type, cfg]) => {
    const item = document.createElement('button');
    item.className = 'palette-item';
    item.innerHTML = `<span class="ic">${cfg.icon}</span><span>${cfg.label}</span>`;
    item.addEventListener('click', () => addField(type));
    list.appendChild(item);
  });
}

/* ---------- Ajout / manipulation de champs ---------- */
function addField(type) {
  const cfg = FIELD_TYPES[type];

  if (cfg.singleton && state.fields.some(f => f.type === type)) {
    toast('Ce champ est déjà présent.');
    return;
  }

  const field = {
    id: uid(),
    type,
    label: defaultLabel(type),
    description: '',
    placeholder: '',
    required: false,
    options: cfg.hasOptions ? ['Option 1', 'Option 2'] : [],
  };
  // Garde le bouton d'envoi toujours en dernier
  const submitIdx = state.fields.findIndex(f => f.type === 'submit');
  if (submitIdx !== -1 && type !== 'submit') {
    state.fields.splice(submitIdx, 0, field);
  } else {
    state.fields.push(field);
  }
  render();
  save();
}

function defaultLabel(type) {
  const map = {
    text: 'Question', textarea: 'Votre message', number: 'Nombre',
    email: 'Adresse e-mail', tel: 'Téléphone', date: 'Date',
    select: 'Choisissez une option', radio: 'Sélectionnez', checkbox: 'Sélectionnez',
    consent: 'J\'accepte les conditions', file: 'Déposez un fichier',
    heading: 'Titre de section', submit: 'Envoyer',
  };
  return map[type] || 'Champ';
}

function moveField(id, dir) {
  const i = state.fields.findIndex(f => f.id === id);
  const j = i + dir;
  if (j < 0 || j >= state.fields.length) return;
  [state.fields[i], state.fields[j]] = [state.fields[j], state.fields[i]];
  render();
  save();
}

function deleteField(id) {
  state.fields = state.fields.filter(f => f.id !== id);
  render();
  save();
}

function updateField(id, patch) {
  const f = state.fields.find(x => x.id === id);
  if (f) Object.assign(f, patch);
  save();
}

/* ============================================================
   Rendu
   ============================================================ */
function render() {
  $('#form-title').value = state.title;
  const descEl = $('#form-desc');
  descEl.value = state.description;
  autoGrow(descEl);
  // En aperçu : champs meta non éditables et description masquée si vide
  const readonly = currentMode === 'preview';
  $('#form-title').readOnly = readonly;
  descEl.readOnly = readonly;
  descEl.classList.toggle('hidden', readonly && !state.description.trim());
  $('#form-title').classList.toggle('hidden', readonly && !state.title.trim());

  canvas.innerHTML = '';
  emptyState.classList.toggle('hidden', state.fields.length > 0 || currentMode === 'preview');

  if (currentMode === 'edit') {
    state.fields.forEach((f, idx) => canvas.appendChild(renderEditCard(f, idx)));
  } else {
    canvas.appendChild(renderPreviewForm());
  }
}

/* ---------- Carte d'édition ---------- */
function renderEditCard(field, idx) {
  const cfg = FIELD_TYPES[field.type];
  const card = document.createElement('div');
  card.className = 'field-card';

  const head = document.createElement('div');
  head.className = 'field-card-head';
  head.innerHTML = `<span class="field-type-badge">${cfg.icon} ${cfg.badge}</span>`;

  const tools = document.createElement('div');
  tools.className = 'field-tools';
  tools.appendChild(iconBtn('↑', 'Monter', () => moveField(field.id, -1), idx === 0));
  tools.appendChild(iconBtn('↓', 'Descendre', () => moveField(field.id, 1), idx === state.fields.length - 1));
  tools.appendChild(iconBtn('🗑', 'Supprimer', () => deleteField(field.id), false, 'danger'));
  head.appendChild(tools);
  card.appendChild(head);

  const conf = document.createElement('div');
  conf.className = 'field-config';

  if (field.type !== 'submit') {
    conf.appendChild(textRow('Libellé', field.label, v => { updateField(field.id, { label: v }); refreshBadgeMirror(); }));
    if (field.type !== 'heading') {
      conf.appendChild(textareaRow('Description', field.description, v => updateField(field.id, { description: v })));
    }
  } else {
    conf.appendChild(textRow('Texte du bouton', field.label, v => updateField(field.id, { label: v })));
  }

  if (cfg.hasPlaceholder) {
    conf.appendChild(textRow('Placeholder', field.placeholder, v => updateField(field.id, { placeholder: v })));
  }
  if (cfg.hasOptions) {
    conf.appendChild(optionsEditor(field));
  }
  if (!cfg.noRequired) {
    conf.appendChild(requiredRow(field));
  }

  card.appendChild(conf);
  return card;
}

function iconBtn(txt, title, onClick, disabled = false, extra = '') {
  const b = document.createElement('button');
  b.className = 'icon-btn ' + extra;
  b.textContent = txt;
  b.title = title;
  b.disabled = disabled;
  b.addEventListener('click', onClick);
  return b;
}

function textRow(label, value, onInput) {
  const row = document.createElement('div');
  row.className = 'cfg-row';
  const l = document.createElement('label');
  l.textContent = label;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = value || '';
  input.addEventListener('input', e => onInput(e.target.value));
  row.append(l, input);
  return row;
}

function textareaRow(label, value, onInput) {
  const row = document.createElement('div');
  row.className = 'cfg-row';
  const l = document.createElement('label');
  l.textContent = label;
  const ta = document.createElement('textarea');
  ta.rows = 2;
  ta.value = value || '';
  ta.addEventListener('input', e => onInput(e.target.value));
  row.append(l, ta);
  return row;
}

function requiredRow(field) {
  const row = document.createElement('div');
  row.className = 'cfg-row';
  const l = document.createElement('label');
  l.textContent = 'Options';
  const wrap = document.createElement('div');
  const check = document.createElement('label');
  check.className = 'cfg-check';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = !!field.required;
  cb.addEventListener('change', e => updateField(field.id, { required: e.target.checked }));
  check.append(cb, document.createTextNode('Champ obligatoire'));
  wrap.appendChild(check);
  row.append(l, wrap);
  return row;
}

function optionsEditor(field) {
  const row = document.createElement('div');
  row.className = 'cfg-row';
  const l = document.createElement('label');
  l.textContent = 'Options';
  const box = document.createElement('div');
  box.className = 'options-editor';

  const redraw = () => {
    box.innerHTML = '';
    field.options.forEach((opt, i) => {
      const line = document.createElement('div');
      line.className = 'option-line';
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.value = opt;
      inp.addEventListener('input', e => { field.options[i] = e.target.value; save(); });
      const del = iconBtn('✕', 'Retirer', () => {
        field.options.splice(i, 1);
        save();
        redraw();
      }, field.options.length <= 1);
      line.append(inp, del);
      box.appendChild(line);
    });
    const add = document.createElement('button');
    add.className = 'btn ghost add-option';
    add.textContent = '＋ Ajouter une option';
    add.addEventListener('click', () => {
      field.options.push('Option ' + (field.options.length + 1));
      save();
      redraw();
    });
    box.appendChild(add);
  };
  redraw();
  row.append(l, box);
  return row;
}

function refreshBadgeMirror() { /* placeholder for potential live label mirror */ }

/* ============================================================
   Aperçu interactif
   ============================================================ */
function renderPreviewForm() {
  const form = document.createElement('form');
  form.className = 'preview-form';
  form.noValidate = false;

  state.fields.forEach(field => form.appendChild(renderPreviewField(field)));

  if (!state.fields.some(f => f.type === 'submit')) {
    const btn = document.createElement('button');
    btn.type = 'submit';
    btn.className = 'submit-btn';
    btn.textContent = 'Envoyer';
    form.appendChild(btn);
  }

  const result = document.createElement('div');
  result.className = 'result-box hidden';
  form.appendChild(result);

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const data = collectData(form);
    result.innerHTML = `<h4>✅ Formulaire soumis — réponses collectées</h4><pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre>`;
    result.classList.remove('hidden');
    result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  return form;
}

function renderPreviewField(field) {
  const cfg = FIELD_TYPES[field.type];
  const wrap = document.createElement('div');
  wrap.className = 'pv-field';

  if (field.type === 'heading') {
    const h = document.createElement('h3');
    h.textContent = field.label;
    h.style.margin = '10px 0 4px';
    wrap.appendChild(h);
    return wrap;
  }

  if (field.type === 'submit') {
    const btn = document.createElement('button');
    btn.type = 'submit';
    btn.className = 'submit-btn';
    btn.textContent = field.label || 'Envoyer';
    wrap.appendChild(btn);
    return wrap;
  }

  if (field.type !== 'consent') {
    const label = document.createElement('label');
    label.className = 'pv-label';
    label.innerHTML = escapeHtml(field.label) + (field.required ? '<span class="req">*</span>' : '');
    wrap.appendChild(label);
  }
  if (field.description) {
    const d = document.createElement('p');
    d.className = 'pv-desc';
    d.textContent = field.description;
    wrap.appendChild(d);
  }

  const name = field.id;

  switch (field.type) {
    case 'textarea': {
      const t = document.createElement('textarea');
      t.name = name; t.placeholder = field.placeholder || ''; t.required = field.required;
      wrap.appendChild(t);
      break;
    }
    case 'select': {
      const s = document.createElement('select');
      s.name = name; s.required = field.required;
      const ph = document.createElement('option');
      ph.value = ''; ph.textContent = '— Choisir —'; ph.disabled = true; ph.selected = true;
      s.appendChild(ph);
      field.options.forEach(o => {
        const op = document.createElement('option');
        op.value = o; op.textContent = o;
        s.appendChild(op);
      });
      wrap.appendChild(s);
      break;
    }
    case 'radio':
    case 'checkbox': {
      field.options.forEach((o, i) => {
        const line = document.createElement('label');
        line.className = 'pv-choice';
        const inp = document.createElement('input');
        inp.type = field.type === 'radio' ? 'radio' : 'checkbox';
        inp.name = field.type === 'radio' ? name : name + '[]';
        inp.value = o;
        if (field.required && field.type === 'radio' && i === 0) inp.required = true;
        line.append(inp, document.createTextNode(' ' + o));
        wrap.appendChild(line);
      });
      break;
    }
    case 'consent': {
      const line = document.createElement('label');
      line.className = 'pv-choice';
      const inp = document.createElement('input');
      inp.type = 'checkbox'; inp.name = name; inp.required = field.required;
      line.append(inp, document.createTextNode(' ' + field.label));
      wrap.appendChild(line);
      break;
    }
    case 'file': {
      wrap.appendChild(buildDropzone(field));
      break;
    }
    default: {
      const inp = document.createElement('input');
      inp.type = field.type; // text | number | email | tel | date
      inp.name = name;
      inp.placeholder = field.placeholder || '';
      inp.required = field.required;
      wrap.appendChild(inp);
    }
  }
  return wrap;
}

function buildDropzone(field) {
  const zone = document.createElement('div');
  zone.className = 'dropzone';
  zone.innerHTML = `<div>📎 Glissez-déposez un fichier ici<br>ou cliquez pour parcourir</div><div class="files"></div>`;
  const input = document.createElement('input');
  input.type = 'file'; input.name = field.id; input.required = field.required;
  input.style.display = 'none';
  input.multiple = true;
  const filesLabel = zone.querySelector('.files');

  const showFiles = () => {
    const names = [...input.files].map(f => f.name);
    filesLabel.textContent = names.length ? '📄 ' + names.join(', ') : '';
  };

  zone.addEventListener('click', () => input.click());
  input.addEventListener('change', showFiles);
  ['dragover', 'dragenter'].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.remove('drag'); }));
  zone.addEventListener('drop', e => { input.files = e.dataTransfer.files; showFiles(); });

  const holder = document.createElement('div');
  holder.append(zone, input);
  return holder;
}

function collectData(form) {
  const data = {};
  state.fields.forEach(field => {
    if (['submit', 'heading'].includes(field.type)) return;
    if (field.type === 'checkbox') {
      const checked = [...form.querySelectorAll(`input[name="${field.id}[]"]:checked`)].map(c => c.value);
      data[field.label] = checked;
    } else if (field.type === 'consent') {
      const el = form.querySelector(`input[name="${field.id}"]`);
      data[field.label] = !!(el && el.checked);
    } else if (field.type === 'file') {
      const el = form.querySelector(`input[name="${field.id}"]`);
      data[field.label] = el && el.files.length ? [...el.files].map(f => f.name) : null;
    } else if (field.type === 'radio') {
      const el = form.querySelector(`input[name="${field.id}"]:checked`);
      data[field.label] = el ? el.value : null;
    } else {
      const el = form.querySelector(`[name="${field.id}"]`);
      data[field.label] = el ? el.value : null;
    }
  });
  return data;
}

/* ============================================================
   Barre supérieure / modes
   ============================================================ */
function bindTopbar() {
  $('#mode-edit').addEventListener('click', () => setMode('edit'));
  $('#mode-preview').addEventListener('click', () => setMode('preview'));
  $('#btn-new').addEventListener('click', newForm);
  $('#btn-save').addEventListener('click', () => { saveToLibrary(); });
  $('#btn-export').addEventListener('click', exportHtml);
  $('#btn-export-json').addEventListener('click', exportJson);
  $('#btn-import-json').addEventListener('click', () => $('#import-input').click());
  $('#import-input').addEventListener('change', importJson);
  $('#btn-duplicate').addEventListener('click', duplicateCurrent);
  $('#btn-library').addEventListener('click', openLibrary);
  $('#library-close').addEventListener('click', closeLibrary);
  $('#library-overlay').addEventListener('click', e => { if (e.target.id === 'library-overlay') closeLibrary(); });
}

function setMode(mode) {
  currentMode = mode;
  document.body.classList.toggle('preview-mode', mode === 'preview');
  $('#mode-edit').classList.toggle('active', mode === 'edit');
  $('#mode-preview').classList.toggle('active', mode === 'preview');
  render();
}

function bindMeta() {
  $('#form-title').addEventListener('input', e => { state.title = e.target.value; save(); });
  const desc = $('#form-desc');
  desc.addEventListener('input', e => { state.description = e.target.value; autoGrow(desc); save(); });
}

function autoGrow(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

function duplicateCurrent() {
  if (!state.fields.length && !state.title.trim()) { toast('Rien à dupliquer'); return; }
  state = {
    id: null, // copie non enregistrée : « Enregistrer » créera une nouvelle entrée
    title: (state.title || 'Sans titre') + ' (copie)',
    description: state.description,
    fields: state.fields.map(f => ({ ...f, id: uid(), options: [...f.options] })),
  };
  save();
  setMode('edit');
  render();
  toast('Copie créée — tu édites maintenant le duplicata');
}

function newForm() {
  if (state.fields.length && !confirm('Créer un nouveau formulaire ? Les modifications non enregistrées dans « Mes formulaires » seront perdues.')) return;
  state = { id: null, title: 'Mon formulaire', description: '', fields: [] };
  render();
  save();
  toast('Nouveau formulaire');
}

/* ============================================================
   Persistance (localStorage)
   ============================================================ */
function save() {
  localStorage.setItem(LS_CURRENT, JSON.stringify(state));
}

function loadCurrentFromStorage() {
  try {
    const raw = localStorage.getItem(LS_CURRENT);
    if (raw) state = JSON.parse(raw);
  } catch (e) { /* ignore */ }
}

function getLibrary() {
  try { return JSON.parse(localStorage.getItem(LS_LIBRARY)) || []; }
  catch (e) { return []; }
}
function setLibrary(lib) { localStorage.setItem(LS_LIBRARY, JSON.stringify(lib)); }

function saveToLibrary() {
  const lib = getLibrary();
  const snapshot = JSON.parse(JSON.stringify(state));
  snapshot.savedAt = Date.now();

  if (state.id) {
    const idx = lib.findIndex(f => f.id === state.id);
    if (idx !== -1) { lib[idx] = snapshot; setLibrary(lib); toast('Formulaire mis à jour'); return; }
  }
  snapshot.id = uid();
  state.id = snapshot.id;
  lib.unshift(snapshot);
  setLibrary(lib);
  save();
  toast('Formulaire enregistré');
}

function openLibrary() {
  const lib = getLibrary();
  const list = $('#library-list');
  list.innerHTML = '';
  if (!lib.length) {
    list.innerHTML = '<div class="library-empty">Aucun formulaire enregistré pour l\'instant.</div>';
  }
  lib.forEach(f => {
    const item = document.createElement('div');
    item.className = 'library-item';
    const main = document.createElement('div');
    main.className = 'li-main';
    const date = new Date(f.savedAt || Date.now());
    main.innerHTML = `<div class="li-name">${escapeHtml(f.title || 'Sans titre')}</div>
      <div class="li-meta">${(f.fields || []).length} champ(s) · ${date.toLocaleDateString('fr-FR')} ${date.toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'})}</div>`;
    main.addEventListener('click', () => loadFromLibrary(f.id));
    const dup = iconBtn('⧉', 'Dupliquer', (e) => { e.stopPropagation(); duplicateInLibrary(f.id); });
    const del = iconBtn('🗑', 'Supprimer', (e) => { e.stopPropagation(); deleteFromLibrary(f.id); }, false, 'danger');
    item.append(main, dup, del);
    list.appendChild(item);
  });
  $('#library-overlay').classList.remove('hidden');
}

function closeLibrary() { $('#library-overlay').classList.add('hidden'); }

function loadFromLibrary(id) {
  const lib = getLibrary();
  const f = lib.find(x => x.id === id);
  if (!f) return;
  state = JSON.parse(JSON.stringify(f));
  save();
  render();
  closeLibrary();
  setMode('edit');
  toast('Formulaire chargé');
}

function duplicateInLibrary(id) {
  const lib = getLibrary();
  const src = lib.find(x => x.id === id);
  if (!src) return;
  const copy = JSON.parse(JSON.stringify(src));
  copy.id = uid();
  copy.title = (src.title || 'Sans titre') + ' (copie)';
  copy.savedAt = Date.now();
  copy.fields = (copy.fields || []).map(f => ({ ...f, id: uid() })); // nouveaux id de champs
  lib.unshift(copy);
  setLibrary(lib);
  openLibrary();
  toast('Formulaire dupliqué');
}

function deleteFromLibrary(id) {
  if (!confirm('Supprimer définitivement ce formulaire ?')) return;
  setLibrary(getLibrary().filter(f => f.id !== id));
  if (state.id === id) state.id = null;
  openLibrary();
  toast('Formulaire supprimé');
}

/* ============================================================
   Export / Import JSON  (format portable — idéal Vercel / Git)
   ============================================================ */
function slugify(str) {
  return (str || 'formulaire').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'formulaire';
}

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a); // requis par Firefox/Safari pour déclencher le téléchargement
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}

// Exporte TOUTE la bibliothèque (tous les formulaires enregistrés) en un seul fichier
function exportJson() {
  const lib = getLibrary();
  if (!lib.length) { toast('Aucun formulaire enregistré à exporter'); return; }
  const payload = {
    schemaVersion: 1,
    type: 'library',
    forms: lib,
    exportedAt: new Date().toISOString(),
  };
  downloadFile(JSON.stringify(payload, null, 2), 'mes-formulaires.json', 'application/json');
  toast(lib.length + ' formulaire(s) exporté(s)');
}

// Importe une bibliothèque : fusionne dans les formulaires enregistrés (par id)
function importJson(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      // Accepte { forms: [...] }, un tableau brut, ou un formulaire unique { fields: [...] }
      let raw;
      if (Array.isArray(data.forms)) raw = data.forms;
      else if (Array.isArray(data)) raw = data;
      else if (Array.isArray(data.fields)) raw = [data];
      else throw new Error('Format non reconnu (« forms » attendu).');

      const lib = getLibrary();
      const byId = new Map(lib.map(f => [f.id, f]));
      let added = 0, updated = 0;
      raw.forEach(r => {
        const form = normalizeForm(r);
        if (!form) return;
        if (byId.has(form.id)) {
          Object.assign(byId.get(form.id), form); // met à jour l'existant (même id)
          updated++;
        } else {
          byId.set(form.id, form);
          lib.unshift(form);
          added++;
        }
      });
      setLibrary(lib);
      openLibrary();
      toast(`Import : ${added} ajouté(s), ${updated} mis à jour`);
    } catch (err) {
      toast('Fichier JSON invalide');
      console.error('Import bibliothèque:', err);
    } finally {
      e.target.value = ''; // permet de réimporter le même fichier
    }
  };
  reader.readAsText(file);
}

function normalizeForm(raw) {
  if (!raw || !Array.isArray(raw.fields)) return null;
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : uid(),
    title: typeof raw.title === 'string' ? raw.title : 'Formulaire importé',
    description: typeof raw.description === 'string' ? raw.description : '',
    fields: raw.fields.map(normalizeField).filter(Boolean),
    savedAt: typeof raw.savedAt === 'number' ? raw.savedAt : Date.now(),
  };
}

function normalizeField(f) {
  if (!f || !FIELD_TYPES[f.type]) return null;
  return {
    id: typeof f.id === 'string' && f.id ? f.id : uid(),
    type: f.type,
    label: typeof f.label === 'string' ? f.label : defaultLabel(f.type),
    description: typeof f.description === 'string' ? f.description : '',
    placeholder: typeof f.placeholder === 'string' ? f.placeholder : '',
    required: !!f.required,
    options: Array.isArray(f.options) ? f.options.map(String) : [],
  };
}

/* ============================================================
   Export HTML autonome
   ============================================================ */
function exportHtml() {
  const html = generateStandaloneHtml();
  downloadFile(html, slugify(state.title) + '.html', 'text/html');
  toast('HTML exporté');
}

function generateStandaloneHtml() {
  const fieldsHtml = state.fields.map(exportField).join('\n');
  const hasSubmit = state.fields.some(f => f.type === 'submit');
  const submitHtml = hasSubmit ? '' : '<button type="submit" class="submit-btn">Envoyer</button>';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(state.title)}</title>
<style>
  body { font-family: system-ui, sans-serif; background:#f4f6fb; color:#1e293b; margin:0; padding:40px 16px; }
  .card { max-width:640px; margin:0 auto; background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:32px; box-shadow:0 4px 12px rgba(15,23,42,.05); }
  h1 { font-size:24px; margin:0 0 6px; }
  .desc { color:#64748b; margin:0 0 24px; }
  .field { margin-bottom:20px; }
  label.main { display:block; font-weight:600; margin-bottom:6px; }
  .req { color:#e11d48; }
  .hint { font-size:13px; color:#64748b; margin:0 0 8px; }
  input[type=text],input[type=email],input[type=number],input[type=date],input[type=tel],select,textarea {
    width:100%; padding:10px 12px; border:1px solid #cbd5e1; border-radius:8px; font:inherit; box-sizing:border-box; }
  textarea { resize:vertical; min-height:90px; }
  .choice { display:flex; align-items:center; gap:8px; margin:6px 0; }
  .dropzone { border:2px dashed #cbd5e1; border-radius:10px; padding:24px; text-align:center; color:#64748b; cursor:pointer; background:#f8fafc; }
  .submit-btn { background:#4f46e5; color:#fff; border:0; padding:12px 24px; border-radius:10px; font:inherit; font-size:15px; font-weight:600; cursor:pointer; }
  .submit-btn:hover { background:#4338ca; }
  h3.section { margin:24px 0 4px; }
</style>
</head>
<body>
<div class="card">
  <h1>${escapeHtml(state.title)}</h1>
  ${state.description ? `<p class="desc">${escapeHtml(state.description)}</p>` : ''}
  <form onsubmit="event.preventDefault(); if(this.checkValidity()){alert('Formulaire valide ✅ (maquette de démonstration)');} else {this.reportValidity();}">
${fieldsHtml}
    ${submitHtml}
  </form>
</div>
</body>
</html>`;
}

function exportField(field) {
  const req = field.required ? ' required' : '';
  const star = field.required ? ' <span class="req">*</span>' : '';
  const desc = field.description ? `<p class="hint">${escapeHtml(field.description)}</p>` : '';
  const labelHtml = `<label class="main">${escapeHtml(field.label)}${star}</label>`;
  const ph = field.placeholder ? ` placeholder="${escapeHtml(field.placeholder)}"` : '';

  switch (field.type) {
    case 'heading':
      return `    <h3 class="section">${escapeHtml(field.label)}</h3>`;
    case 'submit':
      return `    <button type="submit" class="submit-btn">${escapeHtml(field.label || 'Envoyer')}</button>`;
    case 'textarea':
      return `    <div class="field">${labelHtml}${desc}<textarea${ph}${req}></textarea></div>`;
    case 'select':
      return `    <div class="field">${labelHtml}${desc}<select${req}><option value="" disabled selected>— Choisir —</option>${field.options.map(o => `<option>${escapeHtml(o)}</option>`).join('')}</select></div>`;
    case 'radio':
    case 'checkbox': {
      const t = field.type === 'radio' ? 'radio' : 'checkbox';
      const nm = 'g_' + field.id;
      const opts = field.options.map((o, i) => `<label class="choice"><input type="${t}" name="${nm}"${field.required && t==='radio' && i===0 ? ' required' : ''} value="${escapeHtml(o)}"> ${escapeHtml(o)}</label>`).join('');
      return `    <div class="field">${labelHtml}${desc}${opts}</div>`;
    }
    case 'consent':
      return `    <div class="field"><label class="choice"><input type="checkbox"${req}> ${escapeHtml(field.label)}</label>${desc}</div>`;
    case 'file':
      return `    <div class="field">${labelHtml}${desc}<label class="dropzone">📎 Glissez-déposez un fichier ou cliquez<input type="file" style="display:none"${req}></label></div>`;
    default:
      return `    <div class="field">${labelHtml}${desc}<input type="${field.type}"${ph}${req}></div>`;
  }
}

/* ---------- Utilitaires ---------- */
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 2200);
}

/* ---------- Go ---------- */
document.addEventListener('DOMContentLoaded', init);
