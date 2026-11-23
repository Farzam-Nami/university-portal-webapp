// Toggle sidebar on mobile
document.getElementById('menuToggle').addEventListener('click', function() {
    document.getElementById('sidebar').classList.toggle('active');
});

// Close sidebar when clicking outside on mobile
document.addEventListener('click', function(event) {
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menuToggle');
    
    if (window.innerWidth <= 768) {
        if (!sidebar.contains(event.target) && event.target !== menuToggle) {
            sidebar.classList.remove('active');
        }
    }
});

// Set active menu item based on current URL
document.addEventListener('DOMContentLoaded', function() {
    const menuItems = document.querySelectorAll('.menu-item');
    const currentPath = window.location.pathname;
    
    // Remove active class from all menu items
    menuItems.forEach(item => {
        item.classList.remove('active');
        
        // Add active class if href matches current path
        if (item.getAttribute('href') === currentPath) {
            item.classList.add('active');
        }
    });
    
    // Add click event for navigation and highlighting
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            // Only for links with real hrefs (not '#' or empty)
            const href = this.getAttribute('href');
            if (href && href !== '#') {
                // Navigation happens automatically through the href
                menuItems.forEach(i => i.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });
});