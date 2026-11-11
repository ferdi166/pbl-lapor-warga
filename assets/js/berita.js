
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

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('beritaForm');
    const tableBody = document.getElementById('beritaTableBody');
    const modalElement = document.getElementById('modalBerita');
    const databaseName = 'LaporWargaDB';
    const storeName = 'berita';

    if (!form || !tableBody || !modalElement) return;

    // Buka database atau buat database beserta object store jika belum ada.
    function bukaDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('LaporWargaDB', 2);

            request.onupgradeneeded = () => {
                const database = request.result;

                if (!database.objectStoreNames.contains('berita')) {
                    database.createObjectStore('berita', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    function ambilSemuaBerita(database) {
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(storeName, 'readonly');
            const request = transaction.objectStore(storeName).getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    function simpanBerita(database, berita) {
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(storeName, 'readwrite');
            transaction.objectStore(storeName).add(berita);

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
    }

    function buatElemen(tag, className, text) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;
        return element;
    }

    function tampilkanBerita(berita) {
        const row = document.createElement('tr');

        // Kolom judul, ringkasan, dan foto.
        const titleCell = buatElemen('td', 'ps-4');
        const titleLayout = buatElemen('div', 'd-flex align-items-center gap-3');

        const image = document.createElement('img');
        image.src = URL.createObjectURL(berita.foto);
        image.alt = `Foto berita: ${berita.judul}`;
        image.className = 'rounded-3 flex-shrink-0';
        image.style.width = '48px';
        image.style.height = '48px';
        image.style.objectFit = 'cover';

        const textContainer = buatElemen('div', 'overflow-hidden');
        const title = buatElemen('div', 'fw-bold text-dark mb-1', berita.judul);
        const summary = buatElemen('p', 'text-muted small mb-0 text-truncate', berita.ringkasan);
        summary.style.maxWidth = '380px';

        textContainer.append(title, summary);
        titleLayout.append(image, textContainer);
        titleCell.append(titleLayout);

        // Kolom kategori.
        const categoryCell = buatElemen('td', 'text-nowrap');
        const categoryBadge = buatElemen(
            'span',
            'badge bg-primary-subtle text-primary rounded-pill px-2 py-1',
            berita.kategori
        );
        categoryCell.append(categoryBadge);

        // Kolom tanggal dan waktu.
        const dateCell = buatElemen('td', 'text-nowrap');
        const dateLayout = buatElemen('div', 'd-flex flex-column');
        const [datePart, timePart] = berita.tanggal.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const date = new Date(year, month - 1, day);

        dateLayout.append(
            buatElemen('span', 'fw-semibold text-dark',
                date.toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                })
            ),
            buatElemen('span', 'small text-muted', `${timePart} WIB`)
        );
        dateCell.append(dateLayout);

        // Kolom penulis.
        const authorCell = buatElemen('td', 'text-nowrap');
        authorCell.textContent = berita.penulis;

        // Kolom status.
        const statusCell = buatElemen('td', 'text-center text-nowrap');
        const statusClass = berita.status === 'Terpublikasi'
            ? 'badge bg-success-subtle text-success rounded-pill px-2 py-1'
            : 'badge bg-secondary-subtle text-secondary rounded-pill px-2 py-1';
        statusCell.append(buatElemen('span', statusClass, berita.status));

        row.append(titleCell, categoryCell, dateCell, authorCell, statusCell);
        tableBody.prepend(row);
    }

    try {
        const database = await bukaDatabase();
        const beritaTersimpan = await ambilSemuaBerita(database);

        // Urutan ID dari IndexedDB menaik; prepend membuat berita terbaru berada di atas.
        beritaTersimpan.forEach(tampilkanBerita);

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const formData = new FormData(form);
            const foto = formData.get('foto');

            if (!(foto instanceof File) || foto.size === 0) {
                alert('Silakan pilih foto berita.');
                return;
            }

            if (!foto.type.startsWith('image/')) {
                alert('File yang dipilih harus berupa gambar.');
                return;
            }

            if (foto.size > 5 * 1024 * 1024) {
                alert('Ukuran foto maksimal 5 MB.');
                return;
            }

            const beritaBaru = {
                judul: formData.get('judul').trim(),
                ringkasan: formData.get('ringkasan').trim(),
                kategori: formData.get('kategori'),
                tanggal: formData.get('tanggal'),
                penulis: formData.get('penulis').trim(),
                status: formData.get('status'),
                foto: foto
            };

            try {
                await simpanBerita(database, beritaBaru);
                tampilkanBerita(beritaBaru);
                form.reset();
                bootstrap.Modal.getOrCreateInstance(modalElement).hide();
            } catch (error) {
                console.error('Gagal menyimpan berita:', error);
                alert('Berita gagal disimpan. Penyimpanan browser mungkin penuh.');
            }
        });
    } catch (error) {
        console.error('Gagal membuka IndexedDB:', error);
        alert('Browser tidak dapat membuka IndexedDB.');
    }
});