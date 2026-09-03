import { NextRequest, NextResponse } from "next/server";
import { runPatrolSlaReminderEngine } from "@/lib/actions";

export const dynamic = "force-dynamic";

/**
 * Endpoint Vercel Cron: /api/cron/patrol-reminder
 * Dijalankan otomatis setiap hari sesuai jadwal vercel.json (01:00 UTC / 08:00 WIB)
 * Memeriksa seluruh temuan yang berstatus OPEN > 7 hari dan mengirimkan
 * email eskalasi resmi ke PIC Proyek dan General Manager (GM) divisi.
 */
export async function GET(req: NextRequest) {
  return handlePatrolReminderCron(req);
}

export async function POST(req: NextRequest) {
  return handlePatrolReminderCron(req);
}

async function handlePatrolReminderCron(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET?.trim();

  // Jika CRON_SECRET dikonfigurasi di environment Vercel, lakukan verifikasi keamanan
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized: Token otorisasi CRON_SECRET tidak valid.",
        timestamp: new Date().toISOString(),
      },
      { status: 401 }
    );
  }

  // Izinkan kustomisasi parameter ?days=7 (default 7 hari)
  const searchParams = req.nextUrl.searchParams;
  const daysParam = searchParams.get("days");
  const minDaysOverdue = daysParam ? parseInt(daysParam, 10) || 7 : 7;

  try {
    const result = await runPatrolSlaReminderEngine({
      minDaysOverdue,
    });

    return NextResponse.json(
      {
        ...result,
        source: "Vercel Cron Job (/api/cron/patrol-reminder)",
        slaDaysThreshold: minDaysOverdue,
      },
      { status: result.success ? 200 : 500 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Terjadi kesalahan pada cron engine reminder SLA",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
