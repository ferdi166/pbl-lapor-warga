const DB_NAME = 'LaporWargaDB';
const STORE_NAME = 'pengaduan';

function bukaDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);

        request.onupgradeneeded = () => {
            const db = request.result;

            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    })
}

async function simpanPengaduan(data) {
    const db = await bukaDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).put(data);

        transaction.oncomplete = () => {
            db.close();
            resolve();
        };

        transaction.onabort = () => {
            const error = transaction.error;
            db.close();
            reject(error || new Error('Penyimpanan dibatalkan.'));
        }
    })
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('complaintForm');
    if (!form) return;

    const inputFoto = document.getElementById('proofUpload');
    const infoFile = document.getElementById('fileNameTag');
    const pesanSukses = document.getElementById('reportSuccessNotice');

    inputFoto.addEventListener('change', () => {
        const foto = inputFoto.files[0];
        if (!foto) return;

        const teksFile = infoFile.querySelector('span');
        teksFile.textContent = `${foto.name} (${(foto.size / 1024 / 1024).toFixed(2)} MB) - Siap dikirim`;

        infoFile.classList.remove('d-none');
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const foto = inputFoto.files[0];

        if (!foto) {
            alert('Silakan pilih foto bukti terlebih dahulu.');
            return;
        }

        if (!['image/jpeg', 'image/png'].includes(foto.type)) {
            alert('Foto harus berformat JPG atau PNG.');
            return;
        }

        if (foto.size > 5 * 1024 * 1024) {
            alert('Ukuran foto maksimal 5 MB.');
            return;
        }

        const nomorTiket = `#LW-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

        const dataPengaduan = {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            nomorTiket,
            judul: document.getElementById('reportTitle').value.trim(),
            kategori: document.getElementById('reportCategory').value,
            tanggal: document.getElementById('reportDate').value,
            lokasi: document.getElementById('reportLocation').value.trim(),
            deskripsi: document.getElementById('reportDescription').value.trim(),
            foto,
            dibuatPada: new Date().toISOString()
        };

        try {
            await simpanPengaduan(dataPengaduan);

            const nomorTiketDiPesan = pesanSukses.querySelector('strong');
            if (nomorTiketDiPesan) {
                nomorTiketDiPesan.textContent = nomorTiket;
            }

            pesanSukses.classList.remove('d-none');
            form.reset();
            infoFile.classList.add('d-none');
        } catch (error) {
            console.error('Gagal menyimpan pengaduan:', error);
            alert('Pengaduan gagal disimpan. Coba lagi.')
        }
    })
})