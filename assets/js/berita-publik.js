document.addEventListener('DOMContentLoaded', tampilkanBeritaPublik);

function ambilBeritaPublik() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('LaporWargaDB', 2);

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
            const db = request.result;

            if (!db.objectStoreNames.contains('berita')) {
                db.close();
                reject(new Error('Object store "berita" tidak ditemukan.'));
                return;
            }

            const transaction = db.transaction('berita', 'readonly');
            const getAllRequest = transaction.objectStore('berita').getAll();

            getAllRequest.onsuccess = () => resolve(getAllRequest.result);
            getAllRequest.onerror = () => reject(getAllRequest.error);

            transaction.oncomplete = () => db.close();
            transaction.onerror = () => {
                db.close();
                reject(transaction.error);
            };
        };
    });
}

function buatElemen(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

function formatTanggal(tanggal) {
    if (!tanggal) return '-';

    // Input tanggal dari formulir umumnya berbentuk YYYY-MM-DD atau YYYY-MM-DDTHH:mm.
    const [bagianTanggal] = tanggal.split('T');
    const [tahun, bulan, hari] = bagianTanggal.split('-').map(Number);
    const date = new Date(tahun, bulan - 1, hari);

    return Number.isNaN(date.getTime())
        ? tanggal
        : date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
}

function buatKartuBerita(berita) {
    const kolom = buatElemen('div', 'col-12 col-md-6 col-lg-4');
    const kartu = buatElemen(
        'div',
        'card h-100 border-0 shadow-sm rounded-4 overflow-hidden hover-lift'
    );

    const areaGambar = buatElemen('div', 'position-relative');
    areaGambar.style.aspectRatio = '16 / 9';

    if (berita.foto instanceof Blob) {
        const gambar = document.createElement('img');
        gambar.src = URL.createObjectURL(berita.foto);
        gambar.alt = berita.judul || 'Foto berita';
        gambar.className = 'w-100 h-100 object-fit-cover';
        areaGambar.append(gambar);
    } else {
        areaGambar.classList.add('bg-light');
    }

    const kategori = buatElemen(
        'span',
        'position-absolute top-0 start-0 m-3 badge bg-white text-dark shadow-sm rounded-pill px-3 py-1 fw-semibold bg-primary bg-opacity-10',
        berita.kategori || 'Berita'
    );
    areaGambar.append(kategori);

    const isiKartu = buatElemen(
        'div',
        'card-body p-4 d-flex flex-column justify-content-between'
    );
    const bagianTeks = document.createElement('div');

    bagianTeks.append(
        buatElemen(
            'small',
            'text-muted d-block mb-2',
            `${formatTanggal(berita.tanggal)} • ${berita.penulis || 'LaporWarga'}`
        ),
        buatElemen('h6', 'card-title fw-bold text-dark mb-2', berita.judul || ''),
        buatElemen('p', 'card-text text-secondary small', berita.ringkasan || '')
    );

    const tautan = buatElemen(
        'a',
        'text-decoration-none fw-bold text-primary small d-inline-flex align-items-center gap-1 mt-3'
    );
    tautan.href = '#';
    tautan.append(
        buatElemen('span', '', 'Baca Selengkapnya'),
        buatElemen('i', 'bi bi-arrow-right')
    );

    isiKartu.append(bagianTeks, tautan);
    kartu.append(areaGambar, isiKartu);
    kolom.append(kartu);

    return kolom;
}

async function tampilkanBeritaPublik() {
    const wadah = document.getElementById('beritaPublikCards');
    if (!wadah) return;

    try {
        const semuaBerita = await ambilBeritaPublik();

        const beritaTerpublikasi = semuaBerita
            .filter(berita => berita.status === 'Terpublikasi')
            .sort((a, b) => Number(b.id) - Number(a.id));

        wadah.replaceChildren();

        if (beritaTerpublikasi.length === 0) {
            wadah.append(
                buatElemen(
                    'p',
                    'col-12 text-center text-secondary',
                    'Belum ada berita yang dipublikasikan.'
                )
            );
            return;
        }

        beritaTerpublikasi.forEach(berita => {
            wadah.append(buatKartuBerita(berita));
        });
    } catch (error) {
        console.error('Gagal memuat berita publik:', error);
        wadah.replaceChildren(
            buatElemen('p', 'col-12 text-center text-danger', 'Berita gagal dimuat.')
        );
    }
}