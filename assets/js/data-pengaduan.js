
(function () {
    // Sidebar Active State Synchronization
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
    navLinks.forEach(link => {
        if (link.getAttribute('data-path') === 'data-pengaduan') {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Real-time table search and filter simulation
    const searchInput = document.getElementById('searchInput');
    const filterCategory = document.getElementById('filterCategory');
    const filterStatus = document.getElementById('filterStatus');
    const btnResetFilter = document.getElementById('btnResetFilter');
    const activeFilterCountBadge = document.getElementById('activeFilterCount');
    const rows = document.querySelectorAll('#complaintsTable tbody tr');

    function updateFilters() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const selectedCategory = filterCategory.value.toLowerCase();
        const selectedStatus = filterStatus.value.toLowerCase();

        let activeCount = 0;
        if (searchTerm) activeCount++;
        if (selectedCategory) activeCount++;
        if (selectedStatus) activeCount++;
        if (activeFilterCountBadge) activeFilterCountBadge.textContent = activeCount;

        rows.forEach(row => {
            const textContent = row.textContent.toLowerCase();
            const matchesSearch = !searchTerm || textContent.includes(searchTerm);
            const matchesCategory = !selectedCategory || textContent.includes(selectedCategory);
            const matchesStatus = !selectedStatus || textContent.includes(selectedStatus);

            if (matchesSearch && matchesCategory && matchesStatus) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    if (searchInput) searchInput.addEventListener('input', updateFilters);
    if (filterCategory) filterCategory.addEventListener('change', updateFilters);
    if (filterStatus) filterStatus.addEventListener('change', updateFilters);

    if (btnResetFilter) {
        btnResetFilter.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (filterCategory) filterCategory.value = '';
            if (filterStatus) filterStatus.value = '';
            const filterDateRange = document.getElementById('filterDateRange');
            if (filterDateRange) filterDateRange.value = 'all';
            updateFilters();
        });
    }

    const btnRefreshData = document.getElementById('btnRefreshData');
    if (btnRefreshData) {
        btnRefreshData.addEventListener('click', function () {
            const icon = this.querySelector('i');
            if (icon) icon.classList.add('spin-animation');
            setTimeout(() => {
                if (icon) icon.classList.remove('spin-animation');
            }, 600);
        });
    }
})();
