const DB_NAME = 'LaporWargaDB';
const STORE_NAME = 'pengaduan';

function ambilSemuaPengaduan() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);

        request.onupgradeneeded = () => {
            const db = request.result;

            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const getAllRequest = transaction.objectStore(STORE_NAME).getAll();

            getAllRequest.onsuccess = () => resolve(getAllRequest.result);
            getAllRequest.onerror = () => reject(getAllRequest.error);
            transaction.oncomplete = () => db.close();
            transaction.onerror = () => reject(transaction.error);
        };
    });
}

function tambahCell(row, text, className = '') {
    const cell = document.createElement('td');
    cell.className = `py-3 px-3 ${className}`;
    cell.textContent = text;
    row.appendChild(cell);
}

async function tampilkanPengaduan() {
    const tbody = document.getElementById('dashboardPengaduanBody');
    if (!tbody) return;

    try {
        const data = await ambilSemuaPengaduan();
        data.sort((a, b) =>
            new Date(b.dibuatPada || b.tanggal) -
            new Date(a.dibuatPada || a.tanggal)
        );

        tbody.replaceChildren();

        const terbaru = data.slice(0, 5);
        if (terbaru.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 6;
            cell.className = 'py-4 text-center text-secondary';
            cell.textContent = 'Belum ada pengaduan.';
            row.appendChild(cell);
            tbody.appendChild(row);
            return;
        }

        for (const item of terbaru) {
            const row = document.createElement('tr');
            const waktu = item.dibuatPada || item.tanggal;
            const waktuTampil = waktu
                ? new Date(waktu).toLocaleString('id-ID')
                : '-';

            tambahCell(row, item.nomorTiket || '-', 'fw-bold text-primary');
            tambahCell(row, waktuTampil, 'text-secondary text-nowrap');
            // tambahCell(row, item.namaPelapor || '-', 'text-dark');
            tambahCell(row, item.judul || '-', 'text-dark');

            const statusCell = document.createElement('td');
            statusCell.className = 'py-3 px-3 text-center';

            const statusText = String(item.status || '').toLowerCase();

            const statusKey = item.statusKode || (
                statusText.includes('selesai') ? 'selesai' :
                    statusText.includes('tolak') ? 'tolak' :
                        statusText.includes('proses') ? 'proses' :
                            statusText.includes('verifikasi') ? 'verifikasi' :
                                'menunggu'
            );

            row.dataset.status = statusKey;

            const statusStyles = {
                menunggu: 'bg-warning bg-opacity-10 text-warning',
                verifikasi: 'bg-primary bg-opacity-10 text-primary',
                proses: 'bg-info bg-opacity-10 text-info',
                selesai: 'bg-success bg-opacity-10 text-success',
                tolak: 'bg-danger bg-opacity-10 text-danger'
            };

            const badge = document.createElement('span');
            badge.className = `badge rounded-pill ${statusStyles[statusKey] || statusStyles.menunggu} px-3 py-1`;
            badge.textContent = item.status || 'Menunggu Verifikasi';
            statusCell.appendChild(badge);
            row.appendChild(statusCell);

            const actionCell = document.createElement('td');
            actionCell.className = 'py-3 px-3 text-end';
            row.appendChild(actionCell);

            const actionButton = document.createElement('button');
            actionButton.type = 'button';
            actionButton.className = 'btn btn-primary btn-sm px-3 rounded-2 text-nowrap';
            actionButton.textContent = 'Tindak Lanjuti';
            actionButton.dataset.bsToggle = 'modal';
            actionButton.dataset.bsTarget = '#actionModal';

            actionButton.addEventListener('click', () => {
                document.getElementById('actionModalLabel').textContent = `Tindak Lanjut Pengaduan ${item.nomorTiket || ''}`;

                // document.getElementById('modalNamaPelapor').textContent = item.namaPelapor || 'Belum tersedia';
                // document.getElementById('modalNik').textContent = item.nik || 'Belum tersedia';
                document.getElementById('modalLokasi').textContent = item.lokasi || '-';
                document.getElementById('modalKategori').textContent = item.kategori || '-';
                document.getElementById('modalDeskripsi').textContent = item.deskripsi || '';

                document.getElementById('responseForm').dataset.pengaduanId = item.id;
                document.getElementById('responseText').value = item.tanggapan?.catatan || '';
                document.getElementById('responseTarget').value = item.tanggapan?.targetSelesai || '';
                document.getElementById('responseStatus').value = item.statusKode || 'proses';
                document.getElementById('responseOpd').value = item.disposisiKode || '';

                const badge = document.getElementById('modalStatusBadge');

                const statusText = String(item.status || '').toLowerCase();
                const statusKey = item.statusKode || (
                    statusText.includes('selesai') ? 'selesai' :
                        statusText.includes('tolak') ? 'tolak' :
                            statusText.includes('proses') ? 'proses' :
                                statusText.includes('verifikasi') ? 'verifikasi' :
                                    'menunggu'
                );

                const warnaStatus = {
                    menunggu: ['bg-warning', 'text-warning', 'border-warning', 'border-opacity-25'],
                    verifikasi: ['bg-primary', 'text-primary', 'border-primary', 'border-opacity-25'],
                    proses: ['bg-info', 'text-info', 'border-info', 'border-opacity-25'],
                    selesai: ['bg-success', 'text-success', 'border-success', 'border-opacity-25'],
                    tolak: ['bg-danger', 'text-danger', 'border-danger', 'border-opacity-25']
                };

                badge.classList.remove(
                    'bg-warning', 'text-warning', 'border-warning',
                    'bg-primary', 'text-primary', 'border-primary',
                    'bg-info', 'text-info', 'border-info',
                    'bg-success', 'text-success', 'border-success',
                    'bg-danger', 'text-danger', 'border-danger'
                );

                badge.classList.add(...(warnaStatus[statusKey] || warnaStatus.menunggu));
                badge.textContent = item.status || 'Menunggu Verifikasi';

                const foto = document.getElementById('modalFoto');
                const namaFoto = document.getElementById('modalNamaFoto');

                if (item.foto instanceof Blob) {
                    foto.src = URL.createObjectURL(item.foto);
                    namaFoto.textContent = item.foto.name || 'Foto bukti pengaduan';
                } else {
                    foto.removeAttribute('src');
                    namaFoto.textContent = 'Belum ada foto';
                }
            })

            actionCell.appendChild(actionButton);

            tbody.appendChild(row);
        }
    } catch (error) {
        console.error('Gagal mengambil pengaduan: ', error);
    }
}

document.addEventListener('DOMContentLoaded', tampilkanPengaduan);

document.addEventListener('DOMContentLoaded', () => {
    const filterStatus = document.getElementById('filterDashboardStatus');

    filterStatus?.addEventListener('change', () => {
        const statusTerpilih = filterStatus.value;
        const rows = document.querySelectorAll(
            '#dashboardPengaduanBody tr[data-status]'
        );

        rows.forEach(row => {
            row.hidden = Boolean(
                statusTerpilih && row.dataset.status !== statusTerpilih
            );
        });
    });
});

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