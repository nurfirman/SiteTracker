const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, projectId: true, projectIds: true }
  });
  console.log("Total users:", users.length);
  const picUsers = users.filter(u => u.role === "PIC");
  console.log("PIC users:", picUsers.length);
  picUsers.forEach(p => {
    console.log(`- ${p.name} (${p.email}) -> primary: ${p.projectId}, all: ${JSON.stringify(p.projectIds)}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
