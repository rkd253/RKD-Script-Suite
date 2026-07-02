(function() {
  const currentScript = document.currentScript;
  if (!currentScript) return;
  const target = currentScript.getAttribute('data-target');
  const arg = currentScript.getAttribute('data-arg') || '';

  if (typeof window.__doPostBack === 'function') {
    console.log('[CekBonus-Inject] Calling window.__doPostBack:', target, arg);
    window.__doPostBack(target, arg);
  } else {
    console.warn('[CekBonus-Inject] window.__doPostBack not found, falling back to form submit');
    const form = document.getElementById('aspnetForm') || document.querySelector('form');
    if (form) {
      let targetInput = document.getElementById('__EVENTTARGET') || form.querySelector('input[name="__EVENTTARGET"]');
      if (!targetInput) {
        targetInput = document.createElement('input');
        targetInput.type = 'hidden';
        targetInput.name = '__EVENTTARGET';
        targetInput.id = '__EVENTTARGET';
        form.appendChild(targetInput);
      }
      let argInput = document.getElementById('__EVENTARGUMENT') || form.querySelector('input[name="__EVENTARGUMENT"]');
      if (!argInput) {
        argInput = document.createElement('input');
        argInput.type = 'hidden';
        argInput.name = '__EVENTARGUMENT';
        argInput.id = '__EVENTARGUMENT';
        form.appendChild(argInput);
      }
      targetInput.value = target;
      argInput.value = arg;
      form.submit();
    }
  }
})();
