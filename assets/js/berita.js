
// Simple interactive client-side filter
document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('filterStatus');
    const tableBody = document.getElementById('responseTableBody');

    function applyFilters() {
        const query = (searchInput.value || '').toLowerCase().trim();
        const status = (statusFilter.value || '').toLowerCase().trim();
        const rows = tableBody.querySelectorAll('tr');

        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            const matchesQuery = !query || text.includes(query);
            const matchesStatus = !status || text.includes(status);

            if (matchesQuery && matchesStatus) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (statusFilter) statusFilter.addEventListener('change', applyFilters);
});