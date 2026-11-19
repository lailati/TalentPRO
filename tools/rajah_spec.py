# Spesifikasi rajah Bab 4 (data sahaja). Penyimpan data D1-D10 = jadual pangkalan data sebenar.
PEN, ADM = "Pensyarah", "Admin"

CONTEXT = dict(
    name="Sistem TalentPro",
    entities=[
        ("pen", PEN, "L", [
            ("in", "Maklumat Log Masuk"),
            ("in", "Maklumat Profil dan Perkhidmatan"),
            ("in", "Data Rekod Kriteria dan Dokumen"),
            ("in", "Markah LPPT dan Tatatertib"),
            ("in", "Gred Sasaran"),
            ("out", "Keputusan Log Masuk"),
            ("out", "Profil dan Senarai Rekod"),
            ("out", "Bar Kemajuan dan Senarai Semak"),
            ("out", "Ringkasan Rekod"),
        ]),
        ("adm", ADM, "R", [
            ("in", "Maklumat Log Masuk"),
            ("in", "Maklumat Akaun dan Fail CSV"),
            ("in", "Penapis Semakan Rekod"),
            ("out", "Keputusan Log Masuk"),
            ("out", "Senarai Pengguna dan Pengesahan Akaun"),
            ("out", "Status Kelengkapan Rekod"),
        ]),
    ],
)

STORES = [
    ("D1", "D1", "users"), ("D2", "D2", "lecturers"), ("D3", "D3", "activities"), ("D4", "D4", "research"),
    ("D5", "D5", "publications"), ("D6", "D6", "consultancy"), ("D7", "D7", "achievements"),
    ("D8", "D8", "documents"), ("D9", "D9", "lppt_scores"), ("D10", "D10", "disciplinary"),
]


def S(*ids):
    return [s for s in STORES if s[0] in ids]


def rw(proc, store, label):
    """Dua aliran: proses -> stor dan stor -> proses."""
    return [(proc, store, label), (store, proc, label)]


LEVEL0 = dict(
    left=[("adm", ADM), ("pen", PEN)],
    procs=[
        ("p1", "1.0", "Urus Akaun dan Pengesahan"),
        ("p2", "2.0", "Semak Kelengkapan Rekod Pensyarah"),
        ("p3", "3.0", "Urus Profil dan Maklumat Perkhidmatan"),
        ("p4", "4.0", "Urus Rekod Kriteria KP"),
        ("p5", "5.0", "Urus Markah LPPT dan Tatatertib"),
        ("p6", "6.0", "Semak Kriteria Kenaikan Pangkat"),
        ("p7", "7.0", "Papar Kemajuan dan Ringkasan Rekod"),
    ],
    stores=STORES,
    right_procs=["p6", "p7"],   # pembaca sahaja: sambung ke sisi kanan stor
    flows=[
        ("adm", "p1", "Maklumat Log Masuk"), ("p1", "adm", "Keputusan Log Masuk"),
        ("adm", "p1", "Maklumat Akaun dan Fail CSV"), ("p1", "adm", "Senarai Pengguna dan Pengesahan Akaun"),
        ("pen", "p1", "Maklumat Log Masuk"), ("p1", "pen", "Keputusan Log Masuk"),
        *rw("p1", "D1", "Data Pengguna"), ("p1", "D2", "Data Pensyarah"),
        ("adm", "p2", "Penapis Semakan Rekod"), ("p2", "adm", "Status Kelengkapan Rekod"),
        ("D2", "p2", "Data Pensyarah"),
        ("pen", "p3", "Maklumat Profil dan Perkhidmatan"), ("p3", "pen", "Profil Pensyarah"),
        *rw("p3", "D2", "Data Profil"),
        ("pen", "p4", "Data Rekod Kriteria dan Dokumen"), ("p4", "pen", "Senarai Rekod"),
        *rw("p4", "D3", "Data Aktiviti"), *rw("p4", "D4", "Data Penyelidikan"), *rw("p4", "D5", "Data Penerbitan"),
        *rw("p4", "D6", "Data Konsultansi"), *rw("p4", "D7", "Data Pencapaian"), *rw("p4", "D8", "Data Dokumen"),
        ("pen", "p5", "Markah LPPT dan Tatatertib"), ("p5", "pen", "Senarai LPPT dan Tatatertib"),
        *rw("p5", "D9", "Data LPPT"), *rw("p5", "D10", "Data Tatatertib"),
        ("D2", "p6", "Data Pensyarah"), ("D3", "p6", "Data Aktiviti"), ("D4", "p6", "Data Penyelidikan"),
        ("D5", "p6", "Data Penerbitan"), ("D6", "p6", "Data Konsultansi"), ("D7", "p6", "Data Pencapaian"),
        ("D8", "p6", "Data Dokumen"), ("D9", "p6", "Data LPPT"), ("D10", "p6", "Data Tatatertib"),
        ("p6", "p7", "Keputusan Semakan Kriteria"), ("p7", "p6", "Gred Sasaran"),
        ("pen", "p7", "Gred Sasaran"), ("p7", "pen", "Bar Kemajuan dan Senarai Semak"), ("p7", "pen", "Ringkasan Rekod"),
        ("D2", "p7", "Data Pensyarah"),
    ],
)


def L1(left, procs, stores, flows):
    return dict(left=left, procs=procs, stores=S(*stores), flows=flows)


def crud(pid, pen_in, pen_out, store, data):
    return [("pen", pid, pen_in), *rw(pid, store, data), (pid, "pen", pen_out)]


LEVEL1 = {
    "1.0": L1(
        [("adm", ADM), ("pen", PEN)],
        [("a1", "1.1", "Sahkan Log Masuk"), ("a2", "1.2", "Cipta Akaun"), ("a3", "1.3", "Import Akaun CSV"),
         ("a4", "1.4", "Tetapkan Kata Laluan"), ("a5", "1.5", "Nyahaktifkan atau Padam Akaun")],
        ["D1", "D2"],
        [("adm", "a1", "Maklumat Log Masuk"), ("pen", "a1", "Maklumat Log Masuk"),
         ("D1", "a1", "Data Pengguna"), ("a1", "adm", "Keputusan Log Masuk"), ("a1", "pen", "Keputusan Log Masuk"),
         ("adm", "a2", "Maklumat Akaun"), ("a2", "D1", "Data Pengguna"), ("a2", "D2", "Data Pensyarah"), ("a2", "adm", "Pengesahan Akaun"),
         ("adm", "a3", "Fail CSV"), ("a3", "D1", "Data Pengguna"), ("a3", "D2", "Data Pensyarah"), ("a3", "adm", "Pengesahan Import"),
         ("adm", "a4", "Kata Laluan Baharu"), ("a4", "D1", "Data Kata Laluan"), ("a4", "adm", "Pengesahan Kata Laluan"),
         ("adm", "a5", "Arahan Akaun"), ("D1", "a5", "Data Pengguna"), ("a5", "D1", "Data Pengguna"),
         ("a5", "D2", "Data Pensyarah"), ("a5", "adm", "Senarai Pengguna")],
    ),
    "2.0": L1(
        [("adm", ADM)],
        [("b1", "2.1", "Semak Kelengkapan Rekod"), ("b2", "2.2", "Papar Senarai dan Bilangan Rekod")],
        ["D2"],
        [("D2", "b1", "Data Pensyarah"), ("b1", "b2", "Hasil Semakan Kelengkapan"),
         ("adm", "b2", "Penapis Semakan Rekod"), ("b2", "adm", "Status Kelengkapan Rekod")],
    ),
    "3.0": L1(
        [("pen", PEN)],
        [("c1", "3.1", "Kemas Kini Profil Peribadi"), ("c2", "3.2", "Kemas Kini Maklumat Perkhidmatan"), ("c3", "3.3", "Papar Profil Pensyarah")],
        ["D2"],
        [("pen", "c1", "Maklumat Profil"), *rw("c1", "D2", "Data Profil"),
         ("pen", "c2", "Maklumat Perkhidmatan"), *rw("c2", "D2", "Data Perkhidmatan"),
         ("D2", "c3", "Data Pensyarah"), ("c3", "pen", "Profil Pensyarah")],
    ),
    "4.0": L1(
        [("pen", PEN)],
        [("d1", "4.1", "Urus Aktiviti Akademik"), ("d2", "4.2", "Urus Penyelidikan"), ("d3", "4.3", "Urus Penerbitan"),
         ("d4", "4.4", "Urus Konsultansi"), ("d5", "4.5", "Urus Pencapaian"), ("d6", "4.6", "Urus Dokumen Sokongan")],
        ["D3", "D4", "D5", "D6", "D7", "D8"],
        [*crud("d1", "Data Aktiviti Akademik", "Senarai Aktiviti", "D3", "Data Aktiviti"),
         *crud("d2", "Data Penyelidikan", "Senarai Penyelidikan", "D4", "Data Penyelidikan"),
         *crud("d3", "Data Penerbitan", "Senarai Penerbitan", "D5", "Data Penerbitan"),
         *crud("d4", "Data Konsultansi", "Senarai Konsultansi", "D6", "Data Konsultansi"),
         *crud("d5", "Data Pencapaian", "Senarai Pencapaian", "D7", "Data Pencapaian"),
         *crud("d6", "Fail Dokumen", "Senarai Dokumen", "D8", "Data Dokumen")],
    ),
    "5.0": L1(
        [("pen", PEN)],
        [("e1", "5.1", "Rekod Markah LPPT"), ("e2", "5.2", "Rekod Hukuman Tatatertib"), ("e3", "5.3", "Papar Rekod")],
        ["D9", "D10"],
        [("pen", "e1", "Markah LPPT"), *rw("e1", "D9", "Data LPPT"),
         ("pen", "e2", "Maklumat Tatatertib"), *rw("e2", "D10", "Data Tatatertib"),
         ("D9", "e3", "Data LPPT"), ("D10", "e3", "Data Tatatertib"), ("e3", "pen", "Senarai LPPT dan Tatatertib")],
    ),
    "6.0": L1(
        [("r7", ("7.0", "Papar Kemajuan dan Ringkasan Rekod"))],
        [("f1", "6.1", "Kumpul Data Pensyarah"), ("f2", "6.2", "Tentukan Laluan Gred dan Tetingkap Aktiviti"),
         ("f3", "6.3", "Kira Rekod yang Layak"), ("f4", "6.4", "Semak Tarikh Kelayakan, LPPT dan Tatatertib"),
         ("f5", "6.5", "Jana Senarai Semak dan Jurang")],
        ["D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10"],
        [("D2", "f1", "Data Pensyarah"), ("D3", "f1", "Data Aktiviti"), ("D4", "f1", "Data Penyelidikan"),
         ("D5", "f1", "Data Penerbitan"), ("D6", "f1", "Data Konsultansi"), ("D7", "f1", "Data Pencapaian"),
         ("D8", "f1", "Data Dokumen"), ("D9", "f1", "Data LPPT"), ("D10", "f1", "Data Tatatertib"),
         ("f1", "f2", "Data Terkumpul"), ("r7", "f2", "Gred Sasaran"),
         ("f2", "f3", "Data Dalam Tetingkap"),
         ("f3", "f4", "Rekod Dikira"),
         ("f4", "f5", "Rekod dan Keputusan Kelayakan"),
         ("f5", "r7", "Keputusan Semakan Kriteria")],
    ),
    "7.0": L1(
        [("pen", PEN), ("r6", ("6.0", "Semak Kriteria Kenaikan Pangkat"))],
        [("g1", "7.1", "Pilih Gred Sasaran"), ("g2", "7.2", "Kira Peratus Kemajuan"),
         ("g3", "7.3", "Papar Bar Kemajuan dan Perkara Perlu Dibuat"), ("g4", "7.4", "Jana Ringkasan Rekod")],
        ["D2"],
        [("pen", "g1", "Gred Sasaran"), ("D2", "g1", "Gred Semasa"), ("g1", "r6", "Gred Sasaran"),
         ("r6", "g2", "Keputusan Semakan Kriteria"), ("g2", "g3", "Peratus Kemajuan dan Jurang"),
         ("g3", "pen", "Bar Kemajuan dan Senarai Semak"),
         ("r6", "g4", "Rekod Dikira dan Sebab"), ("D2", "g4", "Data Pensyarah"), ("g4", "pen", "Ringkasan Rekod")],
    ),
}

HIERARCHY = dict(
    root="Sistem TalentPro",
    groups=[
        ("Admin", ["Log Masuk", "Urus Pengguna", "Import Akaun CSV", "Tetapkan Kata Laluan",
                   "Semak Kelengkapan Rekod Pensyarah", "Urus Akaun Sendiri"]),
        ("Pensyarah", ["Log Masuk", "Kemas Kini Profil", "Kemas Kini Maklumat Perkhidmatan", "Urus Rekod Kriteria KP",
                       "Rekod Markah LPPT dan Tatatertib", "Pilih Gred Sasaran", "Lihat Bar Kemajuan", "Cetak Ringkasan Rekod"]),
    ],
)
