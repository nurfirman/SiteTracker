/**
 * Azure OAuth2 / Microsoft Entra ID - Microsoft Graph Mail Dispatcher
 * SiteTracker CMD Construction Patrol Management System
 */

import { getAppBaseUrl } from "./utils";

export interface SendAzureMailOptions {
  recipients: string[];
  subject: string;
  projectName: string;
  division?: string;
  reportType: "INTERNAL_PATROL" | "EXECUTIVE_REKAP";
  messageNote?: string;
  findingsCount: number;
  openCount: number;
  resolvedCount: number;
  closedCount: number;
  inspectorName?: string;
  siteManagerName?: string;
  picName?: string;
  pmName?: string;
  gmName?: string;
  reportDate?: string;
}

export function isAzureMailConfigured(): boolean {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const senderEmail = process.env.AZURE_SENDER_EMAIL;

  return Boolean(
    tenantId &&
      tenantId.trim() !== "" &&
      !tenantId.includes("your_azure_") &&
      clientId &&
      clientId.trim() !== "" &&
      !clientId.includes("your_azure_") &&
      clientSecret &&
      clientSecret.trim() !== "" &&
      !clientSecret.includes("your_azure_") &&
      senderEmail &&
      senderEmail.trim() !== "" &&
      !senderEmail.includes("your_sender_")
  );
}

/**
 * Mendapatkan Access Token OAuth 2.0 dari Microsoft Entra ID
 * Menggunakan OAuth2 Client Credentials Flow (App-only permission: Mail.Send)
 */
async function getAzureOAuthToken(): Promise<string> {
  const tenantId = process.env.AZURE_TENANT_ID?.trim();
  const clientId = process.env.AZURE_CLIENT_ID?.trim();
  const clientSecret = process.env.AZURE_CLIENT_SECRET?.trim();

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error(
      "Konfigurasi Azure OAuth belum lengkap di file .env (AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET)."
    );
  }

  const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("scope", "https://graph.microsoft.com/.default");
  params.append("grant_type", "client_credentials");

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    const errMsg =
      data.error_description ||
      data.error ||
      `Gagal memperoleh token dari Azure (Status: ${response.status})`;
    throw new Error(`[Azure OAuth Error] ${errMsg}`);
  }

  return data.access_token as string;
}

/**
 * Generate Template Email HTML Resmi Berstandar Profesional
 */
function generateReportEmailHtml(options: SendAzureMailOptions): string {
  const reportTitle =
    options.reportType === "INTERNAL_PATROL"
      ? "Form Lembar Hasil Patroli Lapangan (Internal Patrol)"
      : "Laporan Rekapitulasi Eksekutif & Statistik Temuan";

  const inspectionDateFormatted = options.reportDate
    ? new Date(options.reportDate).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" style="max-width: 640px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #7c3aed 100%); padding: 32px 30px; text-align: left;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); padding: 4px 12px; border-radius: 50px; font-size: 11px; font-weight: 800; color: #ffffff; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px;">
                      SITETRACKER CMD REPORT
                    </div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 900; line-height: 1.3;">
                      ${options.projectName}
                    </h1>
                    <p style="margin: 6px 0 0 0; color: #e9d5ff; font-size: 13px;">
                      ${reportTitle}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 30px;">
              
              <!-- Greeting & Context -->
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                Yth. Bapak/Ibu Tim Proyek & Manajemen,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                Berikut terlampir rangkuman resmi laporan hasil patroli pengawasan lapangan untuk proyek <strong>${options.projectName}</strong> per tanggal <strong>${inspectionDateFormatted}</strong>.
              </p>

              <!-- Optional Note -->
              ${
                options.messageNote
                  ? `
              <div style="background-color: #faf5ff; border-left: 4px solid #7c3aed; padding: 14px 16px; border-radius: 8px; margin-bottom: 24px;">
                <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #6b21a8; letter-spacing: 0.5px;">
                  Catatan Tambahan Pengirim:
                </p>
                <p style="margin: 0; font-size: 13px; color: #4c1d95; font-weight: 500; line-height: 1.5;">
                  "${options.messageNote}"
                </p>
              </div>
              `
                  : ""
              }

              <!-- Stats KPI Grid -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td width="25%" style="padding: 6px;">
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; text-align: center;">
                      <span style="display: block; font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">Total</span>
                      <span style="display: block; font-size: 22px; font-weight: 900; color: #0f172a; margin-top: 2px;">${options.findingsCount}</span>
                    </div>
                  </td>
                  <td width="25%" style="padding: 6px;">
                    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 12px; text-align: center;">
                      <span style="display: block; font-size: 10px; font-weight: 800; color: #dc2626; text-transform: uppercase;">Open</span>
                      <span style="display: block; font-size: 22px; font-weight: 900; color: #991b1b; margin-top: 2px;">${options.openCount}</span>
                    </div>
                  </td>
                  <td width="25%" style="padding: 6px;">
                    <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 12px; text-align: center;">
                      <span style="display: block; font-size: 10px; font-weight: 800; color: #d97706; text-transform: uppercase;">Resolved</span>
                      <span style="display: block; font-size: 22px; font-weight: 900; color: #92400e; margin-top: 2px;">${options.resolvedCount}</span>
                    </div>
                  </td>
                  <td width="25%" style="padding: 6px;">
                    <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 12px; text-align: center;">
                      <span style="display: block; font-size: 10px; font-weight: 800; color: #059669; text-transform: uppercase;">Closed</span>
                      <span style="display: block; font-size: 22px; font-weight: 900; color: #065f46; margin-top: 2px;">${options.closedCount}</span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Meta Table Details -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 12px; padding: 16px; border: 1px solid #e2e8f0; margin-bottom: 24px; font-size: 13px;">
                <tr>
                  <td style="padding: 6px 10px; color: #64748b; font-weight: 600; width: 35%;">Tanggal Inspeksi:</td>
                  <td style="padding: 6px 10px; color: #0f172a; font-weight: 800;">${inspectionDateFormatted}</td>
                </tr>
                ${options.division ? `
                <tr>
                  <td style="padding: 6px 10px; color: #64748b; font-weight: 600;">Divisi / Wilayah:</td>
                  <td style="padding: 6px 10px; color: #0284c7; font-weight: 800;">${options.division}</td>
                </tr>` : ""}
                ${options.picName ? `
                <tr>
                  <td style="padding: 6px 10px; color: #64748b; font-weight: 600;">PIC Lapangan:</td>
                  <td style="padding: 6px 10px; color: #0f172a; font-weight: 800;">${options.picName}</td>
                </tr>` : ""}
                ${options.pmName ? `
                <tr>
                  <td style="padding: 6px 10px; color: #64748b; font-weight: 600;">Project Manager (PM):</td>
                  <td style="padding: 6px 10px; color: #059669; font-weight: 800;">${options.pmName}</td>
                </tr>` : ""}
                ${options.gmName ? `
                <tr>
                  <td style="padding: 6px 10px; color: #64748b; font-weight: 600;">General Manager (GM):</td>
                  <td style="padding: 6px 10px; color: #2563eb; font-weight: 800;">${options.gmName}</td>
                </tr>` : ""}
                <tr>
                  <td style="padding: 6px 10px; color: #64748b; font-weight: 600;">Petugas Patroli CMD:</td>
                  <td style="padding: 6px 10px; color: #0f172a; font-weight: 800;">${options.inspectorName || "Inspector CMD Lapangan"}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 10px; color: #64748b; font-weight: 600;">Site Manager (SM):</td>
                  <td style="padding: 6px 10px; color: #0f172a; font-weight: 800;">${options.siteManagerName || "Site Manager Proyek"}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 10px; color: #64748b; font-weight: 600;">Tipe Format:</td>
                  <td style="padding: 6px 10px; color: #6d28d9; font-weight: 800;">${options.reportType}</td>
                </tr>
              </table>

              <!-- Action Callout -->
              <div style="text-align: center; margin: 30px 0 10px 0;">
                <p style="font-size: 12px; color: #64748b; margin-bottom: 12px;">
                  Detail bukti foto temuan dan tindak lanjut perbaikan dapat diakses langsung oleh PIC pada portal web:
                </p>
                <a href="${getAppBaseUrl()}/pic/tasks" target="_blank" style="display: inline-block; background-color: #7c3aed; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-weight: 800; font-size: 13px; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.35);">
                  Buka Portal PIC & Tindak Lanjuti Temuan &rarr;
                </a>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 30px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                Email otomatis dari <strong>SiteTracker CMD</strong> (Construction Quality & Safety Monitoring).<br>
                Dikirim menggunakan Microsoft Graph API (Azure Entra ID OAuth 2.0).
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Mengirim email laporan melalui Microsoft Graph API (Azure OAuth2)
 */
export async function sendEmailViaAzureGraph(
  options: SendAzureMailOptions
): Promise<{
  success: boolean;
  message: string;
  deliveryLog?: {
    id: string;
    timestamp: string;
    recipientsCount: number;
    recipientsList: string[];
    azureMessageId?: string;
  };
}> {
  const senderEmail = process.env.AZURE_SENDER_EMAIL?.trim();

  if (!isAzureMailConfigured() || !senderEmail) {
    throw new Error(
      "Kredensial Azure OAuth2 belum diisi lengkap di file .env. Pastikan AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, dan AZURE_SENDER_EMAIL sudah terisi."
    );
  }

  // 1. Dapatkan Token OAuth2
  const accessToken = await getAzureOAuthToken();

  // 2. Generate Konten HTML Email
  const emailHtml = generateReportEmailHtml(options);

  // 3. Format Payload Microsoft Graph API
  const toRecipients = options.recipients.map((email) => ({
    emailAddress: {
      address: email.trim(),
    },
  }));

  const graphPayload = {
    message: {
      subject: options.subject,
      body: {
        contentType: "HTML",
        content: emailHtml,
      },
      toRecipients: toRecipients,
    },
    saveToSentItems: "true",
  };

  // 4. Panggil Microsoft Graph sendMail Endpoint
  const graphEndpoint = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(
    senderEmail
  )}/sendMail`;

  const graphResponse = await fetch(graphEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(graphPayload),
  });

  const logId = "AZURE-MAIL-" + Date.now().toString().slice(-6);
  const timestamp = new Date().toISOString();

  if (!graphResponse.ok) {
    let errorDetail = "";
    try {
      const errJson = await graphResponse.json();
      errorDetail =
        errJson?.error?.message ||
        errJson?.error?.code ||
        JSON.stringify(errJson);
    } catch {
      errorDetail = await graphResponse.text();
    }

    throw new Error(
      `[Microsoft Graph API Error ${graphResponse.status}] ${errorDetail}`
    );
  }

  return {
    success: true,
    message: `Laporan resmi berhasil dikirimkan via Azure Microsoft Graph ke ${options.recipients.length} penerima (${options.recipients.join(", ")})!`,
    deliveryLog: {
      id: logId,
      timestamp,
      recipientsCount: options.recipients.length,
      recipientsList: options.recipients,
    },
  };
}

export interface OverdueFindingItem {
  ticketCode: string;
  category: string;
  description: string;
  locationDetail: string;
  daysOpen: number;
  createdAt: string;
}

export interface SendEscalationReminderOptions {
  recipients: string[];
  projectName: string;
  division?: string;
  gmName?: string;
  pmName?: string;
  picName?: string;
  overdueFindings: OverdueFindingItem[];
}

/**
 * Generate HTML Template untuk Email Eskalasi SLA Reminder (H+7) ke PIC dan GM
 */
export function generateEscalationReminderEmailHtml(
  options: SendEscalationReminderOptions
): string {
  const dateFormatted = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const findingsRows = options.overdueFindings
    .map(
      (f, idx) => `
    <tr style="background-color: ${idx % 2 === 0 ? "#ffffff" : "#fef2f2"}; border-bottom: 1px solid #fee2e2;">
      <td style="padding: 10px; font-weight: 800; color: #991b1b; font-size: 12px; vertical-align: top;">
        ${f.ticketCode}
        <span style="display: block; font-size: 10px; color: #b91c1c; font-weight: 600; margin-top: 2px;">
          ${f.category}
        </span>
      </td>
      <td style="padding: 10px; font-size: 12px; color: #374151; vertical-align: top;">
        <strong style="color: #111827;">${f.locationDetail}</strong>
        <p style="margin: 4px 0 0 0; color: #4b5563; font-size: 11px; line-height: 1.4;">
          ${f.description}
        </p>
      </td>
      <td style="padding: 10px; font-size: 11px; vertical-align: top; text-align: center; white-space: nowrap;">
        <span style="display: inline-block; background-color: #fee2e2; color: #991b1b; font-weight: 900; padding: 4px 8px; border-radius: 8px; border: 1px solid #fca5a5;">
          ${f.daysOpen} Hari Belum Direspon
        </span>
      </td>
    </tr>
  `
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Peringatan Eskalasi SLA H+7 - ${options.projectName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 650px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner (Crimson Red for SLA Escalation) -->
          <tr>
            <td style="background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 60%, #b91c1c 100%); padding: 32px 30px; text-align: left; color: #ffffff;">
              <span style="display: inline-block; background-color: rgba(254, 202, 202, 0.25); border: 1px solid rgba(254, 202, 202, 0.4); padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 12px; color: #fecaca;">
                🚨 Peringatan Keterlambatan SLA (H+7)
              </span>
              <h1 style="margin: 0; font-size: 22px; font-weight: 900; line-height: 1.3; color: #ffffff;">
                Eskalasi Temuan Patroli Belum Direspon
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 13px; color: #fecaca; line-height: 1.5;">
                Proyek: <strong>${options.projectName}</strong> ${options.division ? `(${options.division})` : ""}
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 28px 30px;">
              
              <!-- Warning Callout Box -->
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 13px; color: #991b1b; line-height: 1.5;">
                  <strong>Pemberitahuan kepada PIC Proyek & General Manager (GM):</strong><br>
                  Sistem monitoring mendeteksi terdapat <strong>${options.overdueFindings.length} temuan patroli</strong> yang telah melewati batas waktu SLA (&gt; 7 hari) tanpa adanya respon atau tindakan perbaikan dari PIC di lapangan.
                </p>
              </div>

              <!-- Organizational Hierarchy Info -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 12px; padding: 14px; border: 1px solid #e2e8f0; margin-bottom: 24px; font-size: 12px;">
                ${options.division ? `
                <tr>
                  <td style="padding: 4px 8px; color: #64748b; font-weight: 600; width: 35%;">Divisi:</td>
                  <td style="padding: 4px 8px; color: #0f172a; font-weight: 800;">${options.division}</td>
                </tr>` : ""}
                ${options.gmName ? `
                <tr>
                  <td style="padding: 4px 8px; color: #64748b; font-weight: 600;">General Manager (GM):</td>
                  <td style="padding: 4px 8px; color: #2563eb; font-weight: 800;">${options.gmName}</td>
                </tr>` : ""}
                ${options.pmName ? `
                <tr>
                  <td style="padding: 4px 8px; color: #64748b; font-weight: 600;">Project Manager (PM):</td>
                  <td style="padding: 4px 8px; color: #059669; font-weight: 800;">${options.pmName}</td>
                </tr>` : ""}
                ${options.picName ? `
                <tr>
                  <td style="padding: 4px 8px; color: #64748b; font-weight: 600;">PIC Lapangan:</td>
                  <td style="padding: 4px 8px; color: #b45309; font-weight: 800;">${options.picName}</td>
                </tr>` : ""}
                <tr>
                  <td style="padding: 4px 8px; color: #64748b; font-weight: 600;">Tanggal Pengecekan Cron:</td>
                  <td style="padding: 4px 8px; color: #0f172a; font-weight: 800;">${dateFormatted}</td>
                </tr>
              </table>

              <!-- Overdue Findings Table -->
              <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 800; color: #0f172a;">
                Daftar Tiket Terlambat Respon:
              </h3>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #fee2e2; border-radius: 12px; overflow: hidden; margin-bottom: 26px;">
                <thead>
                  <tr style="background-color: #fef2f2; border-bottom: 2px solid #fecaca;">
                    <th style="padding: 10px; text-align: left; font-size: 11px; font-weight: 800; color: #991b1b; text-transform: uppercase;">Kode & Tipe</th>
                    <th style="padding: 10px; text-align: left; font-size: 11px; font-weight: 800; color: #991b1b; text-transform: uppercase;">Lokasi & Temuan</th>
                    <th style="padding: 10px; text-align: center; font-size: 11px; font-weight: 800; color: #991b1b; text-transform: uppercase;">Status SLA</th>
                  </tr>
                </thead>
                <tbody>
                  ${findingsRows}
                </tbody>
              </table>

              <!-- Action Callout Button -->
              <div style="text-align: center; margin: 30px 0 10px 0;">
                <p style="font-size: 12px; color: #64748b; margin-bottom: 12px;">
                  PIC dimohon segera mengakses portal dan mengunggah bukti perbaikan:
                </p>
                <a href="${getAppBaseUrl()}/pic/tasks" target="_blank" style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 13px 30px; border-radius: 12px; font-weight: 800; font-size: 13px; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.4);">
                  Buka Portal PIC & Respon Temuan Sekarang &rarr;
                </a>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 30px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                Email eskalasi otomatis terjadwal via <strong>Vercel Cron & Microsoft Graph API</strong>.<br>
                Sistem SiteTracker CMD &copy; ${new Date().getFullYear()}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Mengirim email reminder eskalasi SLA melalui Microsoft Graph API (Azure OAuth2)
 */
export async function sendEscalationReminderViaAzureGraph(
  options: SendEscalationReminderOptions
): Promise<{
  success: boolean;
  message: string;
  deliveryLog?: {
    id: string;
    timestamp: string;
    recipientsCount: number;
    recipientsList: string[];
    azureMessageId?: string;
  };
}> {
  const senderEmail = process.env.AZURE_SENDER_EMAIL?.trim();

  if (!isAzureMailConfigured() || !senderEmail) {
    throw new Error(
      "Kredensial Azure OAuth2 belum diisi lengkap di file .env."
    );
  }

  const accessToken = await getAzureOAuthToken();
  const emailHtml = generateEscalationReminderEmailHtml(options);

  const toRecipients = options.recipients.map((email) => ({
    emailAddress: {
      address: email.trim(),
    },
  }));

  const subject = `[REMINDER SLA H+7] Peringatan Temuan Patroli Belum Direspon (>7 Hari) - ${options.projectName}`;

  const graphPayload = {
    message: {
      subject,
      body: {
        contentType: "HTML",
        content: emailHtml,
      },
      toRecipients: toRecipients,
    },
    saveToSentItems: "true",
  };

  const graphEndpoint = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(
    senderEmail
  )}/sendMail`;

  const graphResponse = await fetch(graphEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(graphPayload),
  });

  const logId = "SLA-REMINDER-" + Date.now().toString().slice(-6);
  const timestamp = new Date().toISOString();

  if (!graphResponse.ok) {
    let errorDetail = "";
    try {
      const errJson = await graphResponse.json();
      errorDetail =
        errJson?.error?.message ||
        errJson?.error?.code ||
        JSON.stringify(errJson);
    } catch {
      errorDetail = await graphResponse.text();
    }

    throw new Error(
      `[Microsoft Graph API Error ${graphResponse.status}] ${errorDetail}`
    );
  }

  return {
    success: true,
    message: `Reminder SLA H+7 berhasil dikirimkan via Azure Microsoft Graph ke ${options.recipients.length} penerima (${options.recipients.join(", ")})!`,
    deliveryLog: {
      id: logId,
      timestamp,
      recipientsCount: options.recipients.length,
      recipientsList: options.recipients,
    },
  };
}

export interface SendPasswordResetMailOptions {
  recipientEmail: string;
  recipientName: string;
  resetCode: string;
  expiresInMinutes?: number;
}

/**
 * Mengirimkan email kode verifikasi reset password melalui Microsoft Graph API
 */
export async function sendPasswordResetMail(
  options: SendPasswordResetMailOptions
): Promise<{ success: boolean; message: string; logId?: string }> {
  const expiresIn = options.expiresInMinutes || 15;
  const configured = isAzureMailConfigured();
  const logId = "RESET-PWD-" + Date.now().toString().slice(-6);

  if (!configured) {
    console.info(
      `[Azure Mail Fallback] Password reset OTP for ${options.recipientEmail} (${options.recipientName}): ${options.resetCode}`
    );
    return {
      success: true,
      message: `[Mode Simulasi] Email reset password disimulasikan untuk ${options.recipientEmail}. Kode verifikasi: ${options.resetCode}`,
      logId,
    };
  }

  const senderEmail = process.env.AZURE_SENDER_EMAIL!.trim();
  const accessToken = await getAzureOAuthToken();

  const emailHtml = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Reset Password SiteTracker CMD</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
          <tr>
            <td style="background: linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #7c3aed 100%); padding: 30px 28px; text-align: left;">
              <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); padding: 4px 12px; border-radius: 50px; font-size: 11px; font-weight: 800; color: #ffffff; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px;">
                KEAMANAN AKUN SITETRACKER
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 900; line-height: 1.3;">
                Permintaan Reset Password
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 28px 24px 28px;">
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                Halo <strong>${options.recipientName}</strong>,
              </p>
              <p style="margin: 0 0 20px 0; font-size: 13px; line-height: 1.6; color: #475569;">
                Kami menerima permintaan untuk mengatur ulang kata sandi (reset password) akun SiteTracker CMD Anda. Gunakan kode verifikasi di bawah ini untuk melanjutkan:
              </p>
              
              <div style="text-align: center; margin: 24px 0;">
                <div style="display: inline-block; padding: 18px 36px; background-color: #f5f3ff; border: 2px dashed #7c3aed; border-radius: 16px;">
                  <span style="font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #6d28d9; font-family: 'Courier New', Courier, monospace;">${options.resetCode}</span>
                </div>
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #64748b; font-weight: 600;">
                  ⏱️ Kode OTP berlaku selama <strong>${expiresIn} menit</strong>.
                </p>
              </div>

              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 14px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 12px; color: #991b1b; line-height: 1.5;">
                  <strong>Penting:</strong> Jangan pernah membagikan kode verifikasi ini kepada siapapun, termasuk pihak yang mengatasnamakan Administrator SiteTracker.
                </p>
              </div>

              <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #64748b;">
                Jika Anda tidak merasa melakukan permintaan ini, Anda dapat mengabaikan email ini dengan aman. Password lama Anda tidak akan berubah.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 18px 28px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                SiteTracker CMD © 2026 — Sistem Manajemen Patroli Konstruksi Terpadu
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const graphPayload = {
    message: {
      subject: "🔒 Kode Verifikasi Reset Password Akun SiteTracker CMD",
      body: {
        contentType: "HTML",
        content: emailHtml,
      },
      toRecipients: [
        {
          emailAddress: {
            address: options.recipientEmail,
          },
        },
      ],
    },
    saveToSentItems: "false",
  };

  const graphEndpoint = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(
    senderEmail
  )}/sendMail`;

  const graphResponse = await fetch(graphEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(graphPayload),
  });

  if (!graphResponse.ok) {
    let errorDetail = "";
    try {
      const errJson = await graphResponse.json();
      errorDetail =
        errJson?.error?.message ||
        errJson?.error?.code ||
        JSON.stringify(errJson);
    } catch {
      errorDetail = await graphResponse.text();
    }
    throw new Error(`[Microsoft Graph Error ${graphResponse.status}] ${errorDetail}`);
  }

  return {
    success: true,
    message: `Email kode verifikasi reset password berhasil dikirim ke ${options.recipientEmail}.`,
    logId,
  };
}

