(function hireHopDocgenHeadingToggle() {
  'use strict';

  const HIDDEN_PREFIX = '// ';
  const WRAP_CLASS = 'hh-docgen-hidden-wrap';
  const CHECKBOX_CLASS = 'hh-docgen-hidden-checkbox';

  function isVisible(el) {
    return !!el && el.offsetParent !== null;
  }

  function hasPrefix(value) {
    return /^\s*\/\/\s*/.test(value || '');
  }

  function stripPrefix(value) {
    return (value || '').replace(/^\s*\/\/\s*/, '');
  }

  function applyPrefix(value, hidden) {
    const clean = stripPrefix(value);
    return hidden ? HIDDEN_PREFIX + clean : clean;
  }

  function getHeadingDialogs() {
    return Array.from(document.querySelectorAll('.ui-dialog')).filter(dialog => {
      if (!isVisible(dialog)) return false;

      const title = dialog.querySelector('.ui-dialog-title');
      if (!title) return false;

      return title.textContent.trim().toLowerCase() === 'edit heading';
    });
  }

  function getHeadingForm(dialog) {
    const forms = Array.from(dialog.querySelectorAll('form.edit_type'));
    return forms.find(form => {
      if (!isVisible(form)) return false;
      const kind = form.querySelector('input[name="kind"]');
      return kind && kind.value === '0';
    }) || null;
  }

  function getNameInput(form) {
    return form ? form.querySelector('input[name="name"]') : null;
  }

  function getIdInput(form) {
    return form ? form.querySelector('input[name="id"]') : null;
  }

  function getSaveButton(dialog) {
    const buttons = Array.from(dialog.querySelectorAll('.ui-dialog-buttonpane button'));
    return buttons.find(btn => {
      const text = (btn.textContent || '').trim().toLowerCase();
      return text === 'save';
    }) || null;
  }

  function fireInputEvents(el) {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function buildControl() {
    const wrap = document.createElement('div');
    wrap.className = WRAP_CLASS;
    wrap.style.marginTop = '10px';
    wrap.style.display = 'flex';
    wrap.style.alignItems = 'center';
    wrap.style.gap = '8px';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = CHECKBOX_CLASS;
    checkbox.style.margin = '0';

    const label = document.createElement('label');
    label.textContent = 'Hidden in doc generator';
    label.style.cursor = 'pointer';
    label.style.margin = '0';

    label.addEventListener('click', function (e) {
      e.preventDefault();
      checkbox.checked = !checkbox.checked;
    });

    wrap.appendChild(checkbox);
    wrap.appendChild(label);

    return wrap;
  }

  function ensureControl(form, nameInput) {
    let wrap = form.querySelector('.' + WRAP_CLASS);

    if (!wrap) {
      wrap = buildControl();
      nameInput.insertAdjacentElement('afterend', wrap);
    }

    return wrap;
  }

  function syncDialogState(dialog, form, nameInput, checkbox) {
    const idInput = getIdInput(form);
    const itemId = idInput ? idInput.value : 'new';

    const syncKey = itemId + '|' + (nameInput.defaultValue || '') + '|' + (nameInput.value || '');

    if (dialog.dataset.hhDocgenSyncKey === syncKey) {
      return;
    }

    const currentlyHidden = hasPrefix(nameInput.value);
    checkbox.checked = currentlyHidden;

    if (currentlyHidden) {
      nameInput.value = stripPrefix(nameInput.value);
      fireInputEvents(nameInput);
    }

    dialog.dataset.hhDocgenSyncKey = syncKey;
  }

  function bindSave(dialog, nameInput, checkbox) {
    const saveButton = getSaveButton(dialog);
    if (!saveButton) return;

    if (saveButton.dataset.hhDocgenBound === '1') return;

    saveButton.addEventListener('click', function () {
      nameInput.value = applyPrefix(nameInput.value, checkbox.checked);
      fireInputEvents(nameInput);
    }, true);

    saveButton.dataset.hhDocgenBound = '1';
  }

  function processDialog(dialog) {
    const form = getHeadingForm(dialog);
    if (!form) return;

    const nameInput = getNameInput(form);
    if (!nameInput) return;

    const wrap = ensureControl(form, nameInput);
    const checkbox = wrap.querySelector('.' + CHECKBOX_CLASS);
    if (!checkbox) return;

    syncDialogState(dialog, form, nameInput, checkbox);
    bindSave(dialog, nameInput, checkbox);
  }

  function processAll() {
    getHeadingDialogs().forEach(processDialog);
  }

  const observer = new MutationObserver(processAll);

  function init() {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    processAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
