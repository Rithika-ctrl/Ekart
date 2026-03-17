/**
 * ekart-form-spinner.js  —  Form submit spinner & button disable for Ekart
 * ─────────────────────────────────────────────────────────────────────────
 * Drop-in: include once on any page. No configuration needed.
 *
 *   <script src="/js/ekart-form-spinner.js"></script>
 *
 * WHAT IT DOES:
 *   On every POST form submit:
 *     1. Finds the submit button inside the form
 *     2. Saves its original HTML
 *     3. Replaces it with:  ⟳ spinner + "Please wait…" text
 *     4. Sets disabled=true  — prevents double-submit
 *     5. Re-enables on popstate/pageshow (browser back button)
 *
 * SMART EXCLUSIONS — the following are intentionally skipped:
 *   • GET forms      (search / filter forms — no server round-trip feel)
 *   • data-no-spinner="true" on the form  (opt-out for any form)
 *   • Buttons already disabled at submit time (e.g. OTP verify before input)
 *   • AJAX-only forms (forms that return false from onsubmit stay on page)
 *   • btn-search / btn-filter / btn-icon  classes (quick-action buttons)
 *
 * HANDLES payment.html's handleCODSubmit():
 *   If the form's onsubmit returns false (validation failed), we restore
 *   the button immediately — no stuck spinner.
 *
 * CUSTOM SPINNER TEXT:
 *   Add  data-spinner-text="Saving…"  to the form or button to override
 *   the default "Please wait…" message.
 */
(function () {
  'use strict';

  /* ── Injected CSS ─────────────────────────────────────────────── */
  var CSS = [
    /* Spinning ring used inside the button */
    '@keyframes eksp-spin{to{transform:rotate(360deg)}}',

    /* The inline spinner element */
    '.eksp-ring{',
      'display:inline-block;',
      'width:14px;height:14px;',
      'border:2px solid rgba(0,0,0,0.2);',
      'border-top-color:currentColor;',
      'border-radius:50%;',
      'animation:eksp-spin .65s linear infinite;',
      'vertical-align:middle;',
      'margin-right:6px;',
      'flex-shrink:0;',
    '}',

    /* When button background is yellow (#1a1000 text), use dark spinner */
    '.btn-submit .eksp-ring,.btn-pay .eksp-ring{border-color:rgba(0,0,0,0.15);border-top-color:#1a1000;}',

    /* When button background is dark/glass, use light spinner */
    '.btn-primary .eksp-ring,.btn-checkout .eksp-ring,.btn-express .eksp-ring{',
      'border-color:rgba(255,255,255,0.2);border-top-color:rgba(255,255,255,0.85);',
    '}',

    /* Disabled state — reduce opacity, remove pointer interactions */
    'button.eksp-busy{opacity:0.72;cursor:not-allowed;pointer-events:none;}',

    /* Smooth width transition so button doesn't jump when text changes */
    'button.eksp-busy{transition:opacity 0.2s ease;}',
  ].join('');

  /* ── Spinner HTML builder ─────────────────────────────────────── */
  function spinnerHTML(text) {
    return '<span class="eksp-ring" aria-hidden="true"></span>'
         + '<span>' + text + '</span>';
  }

  /* ── Get spinner text for a button/form ──────────────────────── */
  function getSpinnerText(btn, form) {
    // Priority: button data attr → form data attr → default
    return (btn  && btn.getAttribute('data-spinner-text'))
        || (form && form.getAttribute('data-spinner-text'))
        || 'Please wait\u2026'; // "Please wait…"
  }

  /* ── Should we skip this button? ─────────────────────────────── */
  var SKIP_CLASSES = ['btn-search', 'btn-filter', 'btn-icon', 'btn-post'];

  function shouldSkip(btn, form) {
    if (!btn) return true;
    // GET forms: no spinner needed (page stays / browser handles it fast)
    if (form && (form.method || '').toLowerCase() === 'get') return true;
    // Opt-out attribute on the form
    if (form && form.getAttribute('data-no-spinner') === 'true') return true;
    // Opt-out attribute on the button
    if (btn.getAttribute('data-no-spinner') === 'true') return true;
    // Quick-action button classes
    for (var i = 0; i < SKIP_CLASSES.length; i++) {
      if (btn.classList.contains(SKIP_CLASSES[i])) return true;
    }
    // Already disabled (e.g. OTP verify before full OTP input)
    if (btn.disabled) return true;
    return false;
  }

  /* ── Find the submit button in a form ────────────────────────── */
  function findSubmitBtn(form) {
    // 1. Explicit type="submit"
    var btn = form.querySelector('button[type="submit"]');
    if (btn) return btn;
    // 2. button with no type (default = submit in a form)
    btn = form.querySelector('button:not([type])');
    if (btn) return btn;
    // 3. input[type=submit]
    return form.querySelector('input[type="submit"]');
  }

  /* ── Core: apply spinner to button ───────────────────────────── */
  var _restoreQueue = []; // { btn, originalHTML, minWidth } — for restore on back

  function applySpinner(btn, form) {
    var originalHTML = btn.innerHTML;
    var originalMinWidth = btn.style.minWidth;

    // Lock the button width so it doesn't shrink when text changes
    var currentWidth = btn.offsetWidth;
    if (currentWidth > 0) btn.style.minWidth = currentWidth + 'px';

    var spinText = getSpinnerText(btn, form);
    btn.innerHTML = spinnerHTML(spinText);
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    btn.classList.add('eksp-busy');

    _restoreQueue.push({
      btn         : btn,
      originalHTML: originalHTML,
      originalMinWidth: originalMinWidth
    });
  }

  /* ── Restore all buttons (called on browser back / pageshow) ─── */
  function restoreAll() {
    _restoreQueue.forEach(function (item) {
      item.btn.innerHTML  = item.originalHTML;
      item.btn.disabled   = false;
      item.btn.removeAttribute('aria-busy');
      item.btn.classList.remove('eksp-busy');
      item.btn.style.minWidth = item.originalMinWidth;
    });
    _restoreQueue = [];
  }

  /* ── Main submit listener ─────────────────────────────────────── */
  function onSubmit(e) {
    var form = e.target;
    if (form.tagName !== 'FORM') return;

    var btn = findSubmitBtn(form);
    if (shouldSkip(btn, form)) return;

    // If the form has an onsubmit handler (e.g. handleCODSubmit),
    // we need to check if it returned false (validation failed).
    // The submit event fires AFTER onsubmit returns — if defaultPrevented,
    // the form won't actually submit, so don't spin.
    if (e.defaultPrevented) return;

    applySpinner(btn, form);
  }

  /* ── Bootstrap ───────────────────────────────────────────────── */
  function injectCSS() {
    if (document.getElementById('eksp-css')) return;
    var s = document.createElement('style');
    s.id = 'eksp-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function init() {
    injectCSS();

    // Listen at document level — catches all forms, including ones added later
    document.addEventListener('submit', onSubmit, true); // capture phase

    // Restore buttons if user navigates back (bfcache / popstate)
    window.addEventListener('pageshow', function (e) {
      if (e.persisted) restoreAll(); // bfcache restore
    });
    window.addEventListener('popstate', restoreAll);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ── Public API ──────────────────────────────────────────────── */
  window.EkartFormSpinner = {
    apply      : applySpinner,
    restoreAll : restoreAll
  };

})();