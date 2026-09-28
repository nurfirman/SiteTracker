const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS project_ids text[] DEFAULT '{}';`);
  console.log("SUCCESS: project_ids column added or already exists.");
  
  // Backfill existing projectId into project_ids if project_ids is empty
  await prisma.$executeRawUnsafe(`
    UPDATE users 
    SET project_ids = ARRAY[project_id] 
    WHERE project_id IS NOT NULL 
      AND (project_ids IS NULL OR cardinality(project_ids) = 0);
  `);
  console.log("SUCCESS: Backfilled project_id into project_ids.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
