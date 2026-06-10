window.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('loaded');
  
  // Sidebar toggle
  const menuBtn = document.getElementById('menuBtn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('open');
    });
  }
  
  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    });
  }
  
  // Collapse button for sidebar (desktop)
  const collapseBtn = document.getElementById('collapseBtn');
  if (collapseBtn) {
    collapseBtn.addEventListener('click', () => {
      document.body.classList.toggle('sidebar-collapsed');
      localStorage.setItem('sidebar-collapsed', document.body.classList.contains('sidebar-collapsed'));
    });
  }
  
  // Load sidebar state
  if (localStorage.getItem('sidebar-collapsed') === 'true') {
    document.body.classList.add('sidebar-collapsed');
  }
  
  // Scroll reveal
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });
  
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  // Auto-set active link based on current page filename
  const currentFile = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.s-link[href]').forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === currentFile) link.classList.add('active');
  });
});

function showToast(msg) {
  const toast = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg + ' booked!';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

