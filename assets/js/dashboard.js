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
            tambahCell(row, item.namaPelapor || '-', 'text-dark');
            tambahCell(row, item.judul || '-', 'text-dark');

            const statusCell = document.createElement('td');
            statusCell.className = 'py-3 px-3 text-center';
            const badge = document.createElement('span');
            badge.className = 'badge rounded-pill bg-warning bg-opacity-10 text-warning px-3 py-1';
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

            actionCell.appendChild(actionButton);

            tbody.appendChild(row);
        }
    } catch (error) {
        console.error('Gagal mengambil pengaduan: ', error);
    }
}

document.addEventListener('DOMContentLoaded', tampilkanPengaduan);