/**
 * Azure OAuth2 / Microsoft Entra ID - Microsoft Graph Mail Dispatcher
 * SiteTracker CMD Construction Patrol Management System
 */

export interface SendAzureMailOptions {
  recipients: string[];
  subject: string;
  projectName: string;
  reportType: "INTERNAL_PATROL" | "EXECUTIVE_REKAP";
  messageNote?: string;
  findingsCount: number;
  openCount: number;
  resolvedCount: number;
  closedCount: number;
  inspectorName?: string;
  siteManagerName?: string;
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
                  Detail bukti foto resolusi dan timeline tindak lanjut lengkap dapat diakses pada portal web SiteTracker:
                </p>
                <a href="http://localhost:3000/reports" target="_blank" style="display: inline-block; background-color: #7c3aed; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-weight: 800; font-size: 13px; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.35);">
                  Buka Portal Laporan Lengkap &rarr;
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
