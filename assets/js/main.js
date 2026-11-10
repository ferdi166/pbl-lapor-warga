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
            status: 'Menunggu Verifikasi',
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

async function cariPengaduanDenganTiket(nomorTiket) {
    const db = await bukaDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const request = transaction.objectStore(STORE_NAME).getAll();

        request.onsuccess = () => {
            const masukan = nomorTiket.trim().replace(/^#/, '').toUpperCase();

            const laporan = request.result.find((item) => {
                const tiketTersimpan = String(item.nomorTiket || '')
                    .trim()
                    .replace(/^#/, '')
                    .toUpperCase();

                return tiketTersimpan === masukan;
            });

            resolve(laporan || null);
        };

        request.onerror = () => reject(request.error);

        transaction.oncomplete = () => db.close();
        transaction.onerror = () => {
            db.close();
            reject(transaction.error);
        };
        transaction.onabort = () => {
            db.close();
            reject(transaction.error);
        };
    });
}

function tampilkanHasilTiket(laporan) {
    const kartu = document.getElementById('trackingResultCard');
    kartu.replaceChildren();
    kartu.classList.remove('d-none');

    const judul = document.createElement('h5');
    judul.className = 'fw-bold mb-3';

    if (!laporan) {
        judul.textContent = 'Tiket tidak ditemukan';
        kartu.append(judul);

        const keterangan = document.createElement('p');
        keterangan.className = 'text-secondary mb-0';
        keterangan.textContent = 'Periksa kembali nomor tiket. Pastikan laporan sudah tersimpan di browser ini.';
        kartu.append(keterangan);
        return;
    }

    judul.textContent = laporan.judul;
    kartu.append(judul);

    const detail = document.createElement('p');
    detail.className = 'text-secondary mb-2';
    detail.textContent = `Tiket: ${laporan.nomorTiket} | Kategori: ${laporan.kategori} | Tanggal: ${laporan.tanggal}`;
    kartu.append(detail);

    const lokasi = document.createElement('p');
    lokasi.className = 'mb-2';
    lokasi.textContent = `Lokasi: ${laporan.lokasi}`;
    kartu.append(lokasi);

    const deskripsi = document.createElement('p');
    deskripsi.className = 'mb-3';
    deskripsi.textContent = laporan.deskripsi;
    kartu.append(deskripsi);

    if (laporan.foto instanceof Blob) {
        const foto = document.createElement('img');
        foto.className = 'img-fluid rounded';
        foto.alt = `Foto bukti untuk tiket ${laporan.nomorTiket}`;
        foto.style.maxHeight = '320px';
        foto.src = URL.createObjectURL(laporan.foto);
        kartu.append(foto);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const inputTiket = document.getElementById('ticketInput');
    const tombolCek = document.getElementById('btnCheckTicket');

    if (!inputTiket || !tombolCek) return;

    tombolCek.addEventListener('click', async () => {
        const nomorTiket = inputTiket.value.trim();

        if (!nomorTiket) {
            inputTiket.focus();
            return;
        }

        try {
            const laporan = await cariPengaduanDenganTiket(nomorTiket);
            tampilkanHasilTiket(laporan);
        } catch (error) {
            console.error('Gagal mencari tiket: ', error);
            alert('Terjadi kesalahan saat mencari tiket. Coba lagi.');
        }
    });
});