import { requireRole } from '/assets/js/guards.js';
import { showToast } from '/assets/js/ui.js';

requireRole(['ADMIN', 'STAFF']);

const saveBtn = document.getElementById('save-settings-btn');
if (saveBtn) {
  saveBtn.addEventListener('click', () => {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    setTimeout(() => {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
        <span>Save Configuration</span>
      `;
      showToast('Settings saved successfully!', 'success');
    }, 400);
  });
}
