import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function addBusinessDays(startDate, daysToAdd) {
  if (daysToAdd <= 0) return new Date(startDate.getTime());
  const result = new Date(startDate.getTime());
  if (result.getDay() === 6) {
    result.setDate(result.getDate() + 2);
  } else if (result.getDay() === 0) {
    result.setDate(result.getDate() + 1);
  }

  let added = 1;
  while (added < daysToAdd) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) {
      added++;
    }
  }
  result.setHours(23, 59, 59, 999);
  return result;
}

async function main() {
  console.log("Starting SLA dueDate synchronization...");
  const reports = await prisma.patrolReport.findMany();
  console.log(`Found ${reports.length} patrol reports.`);

  for (const rep of reports) {
    if (!rep.reportNumber) continue;
    const baseDate = rep.createdAt ? new Date(rep.createdAt) : new Date();
    const slaDueDate = addBusinessDays(baseDate, 14);

    console.log(`Report: ${rep.reportNumber}, CreatedAt: ${baseDate.toISOString()}, SLA DueDate (14 business days): ${slaDueDate.toISOString()}`);

    const updateRes = await prisma.finding.updateMany({
      where: { reportNumber: rep.reportNumber },
      data: { dueDate: slaDueDate },
    });

    console.log(`  Updated ${updateRes.count} findings with reportNumber ${rep.reportNumber}`);
  }

  // Findings without reportNumber should have dueDate set to null
  const resetRes = await prisma.finding.updateMany({
    where: {
      OR: [
        { reportNumber: null },
        { reportNumber: "" }
      ]
    },
    data: { dueDate: null }
  });
  console.log(`Reset ${resetRes.count} unreported findings to dueDate: null.`);

  console.log("Synchronization complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
