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

    const statusText = laporan.status || 'Menunggu Verifikasi';
    const statusKey = laporan.statusKode || (
        statusText.toLowerCase().includes('selesai') ? 'selesai' :
            statusText.toLowerCase().includes('tolak') ? 'tolak' :
                statusText.toLowerCase().includes('proses') ? 'proses' :
                    statusText.toLowerCase().includes('verifikasi') ? 'verifikasi' :
                        'menunggu'
    );

    const statusStyles = {
        menunggu: 'bg-warning bg-opacity-10 text-warning',
        verifikasi: 'bg-primary bg-opacity-10 text-primary',
        proses: 'bg-info bg-opacity-10 text-info',
        selesai: 'bg-success bg-opacity-10 text-success',
        tolak: 'bg-danger bg-opacity-10 text-danger'
    };

    const statusBadge = document.createElement('span');
    statusBadge.className = `badge rounded-pill px-3 py-2 ${statusStyles[statusKey] || statusStyles.menunggu}`;
    statusBadge.textContent = statusText;

    const statusBaris = document.createElement('p');
    statusBaris.className = 'mb-3';
    statusBaris.append('Status: ', statusBadge);
    kartu.append(statusBaris);

    const tanggapan = laporan.tanggapan || {};
    const bagianTanggapan = document.createElement('div');
    bagianTanggapan.className = 'mt-3 pt-3 border-top';

    const judulTanggapan = document.createElement('h6');
    judulTanggapan.className = 'fw-bold mb-2';
    judulTanggapan.textContent = 'Tanggapan Petugas';
    bagianTanggapan.append(judulTanggapan);

    const catatan = document.createElement('p');
    catatan.className = 'mb-2';
    catatan.textContent = tanggapan.catatan || 'Belum ada tanggapan dari petugas.';
    bagianTanggapan.append(catatan);

    if (laporan.disposisi) {
        const opd = document.createElement('p');
        opd.className = 'small text-secondary mb-1';
        opd.textContent = `Diteruskan ke: ${laporan.disposisi}`;
        bagianTanggapan.append(opd);
    }

    if (tanggapan.targetSelesai) {
        const target = document.createElement('p');
        target.className = 'small text-secondary mb-1';
        target.textContent = `Target Selesai: ${tanggapan.targetSelesai}`;
        bagianTanggapan.append(target);
    }

    if (tanggapan.dibuatPada) {
        const waktu = document.createElement('p');
        waktu.className = 'small text-secondary mb-1';
        waktu.textContent = `Diperbarui: ${new Date(tanggapan.dibuatPada).toLocaleString('id-ID')}`;
        bagianTanggapan.append(waktu);
    }

    kartu.append(bagianTanggapan);

    const detailLaporan = document.createElement('section');
    detailLaporan.className = 'mt-3';

    const judulDetail = document.createElement('h6');
    judulDetail.className = 'fw-bold mb-3';
    judulDetail.textContent = 'Detail Laporan';
    detailLaporan.append(judulDetail);

    const labelLokasi = document.createElement('div');
    labelLokasi.className = 'small fw-semibold text-secondary mb-1';
    labelLokasi.textContent = 'Lokasi Kejadian';
    detailLaporan.append(labelLokasi);

    const lokasiBaris = document.createElement('div');
    lokasiBaris.className = 'd-flex align-items-start gap-2 mb-3';

    const ikonLokasi = document.createElement('i');
    ikonLokasi.className = 'bi bi-geo-alt-fill text-danger mt-1';
    ikonLokasi.setAttribute('aria-hidden', 'true');

    const teksLokasi = document.createElement('div');
    teksLokasi.className = 'text-dark';
    teksLokasi.textContent = laporan.lokasi || '-';

    lokasiBaris.append(ikonLokasi, teksLokasi);
    detailLaporan.append(lokasiBaris);

    const labelKeterangan = document.createElement('div');
    labelKeterangan.className = 'small fw-semibold text-secondary mb-1';
    labelKeterangan.textContent = 'Keterangan Laporan';
    detailLaporan.append(labelKeterangan);

    const teksDeskripsi = document.createElement('p');
    teksDeskripsi.className = 'text-dark mb-4';
    teksDeskripsi.style.whiteSpace = 'pre-line';
    teksDeskripsi.textContent = laporan.deskripsi || '-';
    detailLaporan.append(teksDeskripsi);

    kartu.append(detailLaporan);

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