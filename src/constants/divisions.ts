export interface DivisionConfig {
  code: string;
  name: string;
  description?: string;
  color?: string;
  isCustom?: boolean;
}

export const MASTER_DIVISIONS: DivisionConfig[] = [
  {
    code: "CMD",
    name: "Construction Management Division",
    description: "Pengawasan manajemen konstruksi, arsitektur, dan struktur proyek.",
    color: "from-blue-600 to-indigo-700",
  },
  {
    code: "ME",
    name: "Mechanical Electrical",
    description: "Instalasi mekanikal, elektrikal, plumbing, dan sistem utilitas gedung/lapangan.",
    color: "from-amber-500 to-orange-600",
  },
  {
    code: "SQCD",
    name: "Safety Quality Construction Division",
    description: "Pengawasan K3, QA/QC, audit mutu, dan kepatuhan standar keselamatan kerja.",
    color: "from-emerald-600 to-teal-700",
  },
  {
    code: "PLAN",
    name: "Plant Division",
    description: "Pabrikasi beton, asphalt mixing plant, batching plant, dan peralatan berat.",
    color: "from-cyan-600 to-blue-700",
  },
  {
    code: "JOIN",
    name: "Joint Division",
    description: "Divisi gabungan operasional proyek kemitraan, KSO, dan joint operation.",
    color: "from-purple-600 to-pink-700",
  },
  {
    code: "BM",
    name: "Business Management",
    description: "Manajemen bisnis, komersial, legalitas kontrak, estimasi biaya, dan administrasi.",
    color: "from-rose-600 to-red-700",
  },
];

/**
 * Normalisasi string input divisi (baik berupa kode "CMD" maupun nama lengkap atau kode divisi kustom)
 * menjadi kode divisi standar. Default fallback adalah "CMD".
 */
export function getDivisionCode(
  rawDivision?: string | null,
  divisionsList: DivisionConfig[] = MASTER_DIVISIONS
): string {
  if (!rawDivision || !rawDivision.trim()) return "CMD";
  const clean = rawDivision.trim().toUpperCase();

  const allDivisions =
    divisionsList && divisionsList.length > 0 ? divisionsList : MASTER_DIVISIONS;

  // 1. Cek kecocokan kode langsung pada daftar divisi aktif maupun master
  const matchByCode =
    allDivisions.find((d) => d.code.toUpperCase() === clean) ||
    MASTER_DIVISIONS.find((d) => d.code.toUpperCase() === clean);
  if (matchByCode) return matchByCode.code.toUpperCase();

  // 2. Cek apakah awalan mengandung kode (e.g. "CMD - Construction..." atau "[ME] Mechanical")
  const bracketMatch = clean.match(/^\[([A-Z0-9_-]{2,12})\]/);
  if (bracketMatch) return bracketMatch[1];

  for (const div of allDivisions) {
    const c = div.code.toUpperCase();
    if (
      clean.startsWith(c + " ") ||
      clean.startsWith(c + "-") ||
      clean.startsWith(c + "/") ||
      clean.startsWith(c + ":") ||
      clean.startsWith(c + "(")
    ) {
      return c;
    }
  }

  // 3. Cek kecocokan nama divisi pada daftar divisi aktif
  const matchByName = allDivisions.find(
    (d) => d.name && d.name.trim().toUpperCase() === clean
  );
  if (matchByName) return matchByName.code.toUpperCase();

  // 4. Jika input sudah berupa kode pendek valid (2-12 karakter huruf/angka tanpa spasi, misal divisi baru hasil CRUD)
  if (/^[A-Z0-9_-]{2,12}$/.test(clean)) {
    return clean;
  }

  // 5. Cek kecocokan substring nama divisi standar
  if (clean.includes("MECHANICAL") || clean.includes("ELEKTRONIK") || clean.includes("LISTRIK")) return "ME";
  if (clean.includes("SAFETY") || clean.includes("QUALITY") || clean.includes("MUTU") || clean.includes("K3")) return "SQCD";
  if (clean.includes("PLANT") || clean.includes("PABRIK") || clean.includes("BATCHING")) return "PLAN";
  if (clean.includes("JOINT") || clean.includes("KSO") || clean.includes("KEMITRAAN")) return "JOIN";
  if (clean.includes("BUSINESS") || clean.includes("BISNIS") || clean.includes("MANAGEMENT") || clean.includes("KOMERSIAL")) return "BM";
  if (clean.includes("CONSTRUCTION") || clean.includes("KONSTRUKSI") || clean.includes("GEDUNG") || clean.includes("SIPIL")) return "CMD";

  return "CMD";
}

/**
 * Format nomor laporan resmi berdasarkan Divisi: DIV-YY-XXX
 * @param divisionCode Kode divisi (e.g. "CMD", "ME", "SQCD", "PLAN", "JOIN", "BM")
 * @param date Tanggal laporan (Date object atau string format "YYYY-MM-DD")
 * @param sequenceNumber Nomor urut integer (e.g. 1 -> "001")
 */
export function formatReportDocNumber(
  divisionCode: string,
  date: string | Date = new Date(),
  sequenceNumber: number = 1
): string {
  const code = getDivisionCode(divisionCode);

  let yearTwoDigits = "26";
  if (typeof date === "string" && date.trim()) {
    const parts = date.split("-");
    if (parts.length >= 1 && parts[0].length === 4) {
      yearTwoDigits = parts[0].slice(-2);
    } else {
      const d = new Date(date);
      if (!isNaN(d.getTime())) {
        yearTwoDigits = d.getFullYear().toString().slice(-2);
      }
    }
  } else if (date instanceof Date && !isNaN(date.getTime())) {
    yearTwoDigits = date.getFullYear().toString().slice(-2);
  }

  const seqStr = String(sequenceNumber).padStart(3, "0");
  return `${code}-${yearTwoDigits}-${seqStr}`;
}
