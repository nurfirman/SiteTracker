import { PrismaClient, Role, Category, FindingStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Neon PostgreSQL database seeding...");

  // Reset database
  await prisma.finding.deleteMany();
  await prisma.user.deleteMany();
  await prisma.project.deleteMany();

  // Create Projects
  const proj1 = await prisma.project.create({
    data: {
      id: "proj-1",
      name: "Proyek Tower Gedung A - SCBD",
      location: "Kaveling 52-53, Jakarta Selatan",
    },
  });

  const proj2 = await prisma.project.create({
    data: {
      id: "proj-2",
      name: "Pembangunan Jembatan Layang Ciawi",
      location: "KM 45 Tol Jagorawi, Bogor",
    },
  });

  const proj3 = await prisma.project.create({
    data: {
      id: "proj-3",
      name: "Renovasi Rumah Sakit Medika Utama",
      location: "Jl. Pemuda No. 12, Surabaya",
    },
  });

  // Create Users
  const cmdUser = await prisma.user.create({
    data: {
      id: "usr-cmd-1",
      name: "Budi Santoso (Patroli CMD)",
      email: "budi.cmd@sitetracker.id",
      role: Role.CMD,
      phoneNumber: "0812-3456-7890",
    },
  });

  const picUser1 = await prisma.user.create({
    data: {
      id: "usr-pic-1",
      name: "Ahmad Fauzi (PIC Site SCBD)",
      email: "ahmad.fauzi@sitetracker.id",
      role: Role.PIC,
      phoneNumber: "0813-8899-0011",
      projectId: proj1.id,
    },
  });

  const picUser2 = await prisma.user.create({
    data: {
      id: "usr-pic-2",
      name: "Bambang Wijaya (PIC Site Ciawi)",
      email: "bambang.w@sitetracker.id",
      role: Role.PIC,
      phoneNumber: "0815-4433-2211",
      projectId: proj2.id,
    },
  });

  const pmUser = await prisma.user.create({
    data: {
      id: "usr-pm-1",
      name: "Ir. H. Hendra Gunawan (PM Utama)",
      email: "hendra.pm@sitetracker.id",
      role: Role.PM,
      phoneNumber: "0811-9900-1122",
    },
  });

  await prisma.user.create({
    data: {
      id: "usr-bod-1",
      name: "Drs. Eko Prasetyo (BOD / Direksi)",
      email: "eko.bod@sitetracker.id",
      role: Role.BOD,
      phoneNumber: "0818-7766-5544",
    },
  });

  // Create Sample Findings
  await prisma.finding.create({
    data: {
      id: "find-1",
      ticketCode: "CMD-2026-001",
      projectId: proj1.id,
      picId: picUser1.id,
      reporterId: cmdUser.id,
      locationDetail: "Lantai 4 - Area Bekisting Kolom K-08",
      coordinates: "-6.2241, 106.8094",
      category: Category.K3_SAFETY,
      description: "Ditemukan 3 pekerja subkontraktor bekerja pada ketinggian 6 meter tanpa safety harness dan tali pengaman terpasang pada lifeline.",
      photoFindingUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80",
      status: FindingStatus.OPEN,
    },
  });

  await prisma.finding.create({
    data: {
      id: "find-2",
      ticketCode: "CMD-2026-002",
      projectId: proj1.id,
      picId: picUser1.id,
      reporterId: cmdUser.id,
      locationDetail: "Lantai 2 - Dinding Panel Sisi Timur",
      coordinates: "-6.2243, 106.8091",
      category: Category.QUALITY,
      description: "Retak rambut sepanjang 45cm pada plesteran dinding batas timur akibat proses curing yang terlalu cepat dan kurang pembasahan.",
      photoFindingUrl: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=800&q=80",
      status: FindingStatus.RESOLVED,
      picResponse: "Telah dilakukan chipping area retak, pengolesan bonding agent mortar epoxy, serta finishing ulang plesteran dan curing basah selama 3 hari.",
      photoResolutionUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
      resolvedAt: new Date("2026-08-20T11:00:00Z"),
    },
  });

  await prisma.finding.create({
    data: {
      id: "find-3",
      ticketCode: "CMD-2026-003",
      projectId: proj2.id,
      picId: picUser2.id,
      reporterId: cmdUser.id,
      locationDetail: "Pier 3 - Saluran Drainase Sementara",
      coordinates: "-6.6501, 106.8402",
      category: Category.KEBERSIHAN_5R,
      description: "Sisa potongan kayu bekisting dan puing semen menumpuk di saluran drainase temporary sehingga berpotensi banjir saat hujan deras.",
      photoFindingUrl: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80",
      status: FindingStatus.CLOSED,
      picResponse: "Tim 5R proyek telah pembersihan total material kayu dan semen. Saluran kini lancar kembali dan disediakan dump bin khusus.",
      photoResolutionUrl: "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?auto=format&fit=crop&w=800&q=80",
      resolvedAt: new Date("2026-08-18T16:20:00Z"),
      closedAt: new Date("2026-08-19T09:00:00Z"),
    },
  });

  console.log("✅ Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
