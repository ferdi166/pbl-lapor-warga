
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

const DB_NAME = 'LaporWargaDB';
const STORE_NAME = 'pengaduan';

function ambilSemuaPengaduan() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction(STORE_NAME, 'readonly');
            const getAll = tx.objectStore(STORE_NAME).getAll();

            getAll.onsuccess = () => resolve(getAll.result);
            getAll.onerror = () => reject(getAll.error);
            tx.oncomplete = () => db.close();
        };
    });
}

async function tampilkanPengaduan() {
    const tbody = document.querySelector('#complaintsTable tbody');
    const data = await ambilSemuaPengaduan();

    data.sort((a, b) =>
        new Date(b.dibuatPada || b.tanggal) -
        new Date(a.dibuatPada || a.tanggal)
    );

    tbody.replaceChildren();

    for (const item of data) {
        const row = document.createElement('tr');
        const waktu = item.dibuatPada || item.tanggal;

        const isi = [
            item.nomorTiket || '-',
            waktu ? new Date(waktu).toLocaleString('id-ID') : '-',
            item.kategori || '-',
            `${item.judul || '-'} — ${item.lokasi || '-'}`,
        ];

        for (const nilai of isi) {
            const cell = document.createElement('td');
            cell.className = 'px-3 py-3';
            cell.textContent = nilai;
            row.appendChild(cell);
        }

        const statusText = String(item.status || 'Menunggu Verifikasi');
        const statusLower = statusText.toLowerCase();

        const statusKey = item.statusKode || (
            statusLower.includes('tolak') ? 'tolak' :
                statusLower.includes('selesai') ? 'selesai' :
                    statusLower.includes('proses') ? 'proses' :
                        statusLower.includes('verifikasi') ? 'verifikasi' :
                            'menunggu'
        );

        const badgeStyles = {
            menunggu: 'bg-warning bg-opacity-10 text-warning',
            verifikasi: 'bg-primary bg-opacity-10 text-primary',
            proses: 'bg-info bg-opacity-10 text-info',
            selesai: 'bg-success bg-opacity-10 text-success',
            tolak: 'bg-danger bg-opacity-10 text-danger'
        };

        const statusCell = document.createElement('td');
        statusCell.className = 'px-3 py-3 text-nowrap';

        const badge = document.createElement('span');
        badge.className =
            `badge rounded-pill border ${badgeStyles[statusKey] || badgeStyles.menunggu} ` +
            'px-2 py-1 d-inline-flex align-items-center text-nowrap';
        badge.textContent = statusText;

        statusCell.appendChild(badge);
        row.appendChild(statusCell);

        const actionCell = document.createElement('td');
        actionCell.className = 'px-3 py-3 text-end pe-4 text-nowrap';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-sm btn-primary px-3';
        button.textContent = 'Tindak Lanjuti';
        button.dataset.bsToggle = 'modal';
        button.dataset.bsTarget = '#actionModal';

        button.addEventListener('click', () => {
            document.getElementById('actionModalLabel').textContent =
                `Tindak Lanjut Pengaduan ${item.nomorTiket || ''}`;
            document.getElementById('modalLokasi').textContent = item.lokasi || '-';
            document.getElementById('modalKategori').textContent = item.kategori || '-';
            document.getElementById('modalDeskripsi').textContent = item.deskripsi || '-';

            const form = document.getElementById('responseForm');
            form.dataset.pengaduanId = item.id;

            document.getElementById('responseText').value =
                item.tanggapan?.catatan || '';
            document.getElementById('responseTarget').value =
                item.tanggapan?.targetSelesai || '';
            document.getElementById('responseStatus').value =
                item.statusKode || 'proses';
            document.getElementById('responseOpd').value =
                item.disposisiKode || 'pupr';
        });

        actionCell.appendChild(button);
        row.appendChild(actionCell);

        tbody.appendChild(row);
    }
}

document.addEventListener('DOMContentLoaded', tampilkanPengaduan);

function simpanTanggapanPengaduan(id, perubahan) {
    return new Promise((resolve, reject) => {
        const requestDb = indexedDB.open(DB_NAME, 1);

        requestDb.onerror = () => reject(request.error);

        requestDb.onsuccess = () => {
            const db = requestDb.result;
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(id);
            let error;

            request.onsuccess = () => {
                if (!request.result) {
                    error = new Error('Pengaduan tidak ditemukan.');
                    transaction.abort();
                    return;
                }

                store.put({
                    ...request.result,
                    ...perubahan
                });
            };

            request.onerror = () => {
                error = request.error;
                transaction.abort();
            };

            transaction.oncomplete = () => {
                db.close();
                resolve();
            };

            transaction.onabort = () => {
                db.close();
                reject(error || transaction.error || new Error('Penyimpanan gagal.'));
            };

            transaction.onerror = () => {
                error = error || transaction.error;
            };
        };
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const responseForm = document.getElementById('responseForm');

    responseForm?.addEventListener('submit', async (event) => {
        event.preventDefault();

        const id = responseForm.dataset.pengaduanId;
        if (!id) {
            alert('Pengaduan yang akan ditanggapi belum dipilih.');
            return;
        }

        const statusSelect = document.getElementById('responseStatus');
        const opdSelect = document.getElementById('responseOpd');

        const perubahan = {
            statusKode: statusSelect.value,
            status: statusSelect.options[statusSelect.selectedIndex].text,
            disposisiKode: opdSelect.value,
            disposisi: opdSelect.options[opdSelect.selectedIndex].text,
            tanggapan: {
                catatan: document.getElementById('responseText').value.trim(),
                targetSelesai: document.getElementById('responseTarget').value.trim(),
                dibuatPada: new Date().toISOString()
            }
        };

        try {
            await simpanTanggapanPengaduan(id, perubahan);

            bootstrap.Modal
                .getOrCreateInstance(document.getElementById('actionModal'))
                .hide();

            await tampilkanPengaduan();
            alert('Tanggapan berhasil disimpan.');
        } catch (error) {
            console.error('Gagal menyimpan tanggapan: ', error);
            alert('Tanggapan gagal disimpan. Coba lagi.');
        }
    })
})