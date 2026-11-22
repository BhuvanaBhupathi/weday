/* Removes the E2E test artifacts (bands named "E2E Canvas …" and users "e2e-…"). */
const path = '/Users/poulamisaha/coding/friday/backend/node_modules/@prisma/client';
const { PrismaClient } = require(path);
const prisma = new PrismaClient();

async function main() {
  const bands = await prisma.band.findMany({ where: { name: { startsWith: 'E2E Canvas ' } } });
  const ids = bands.map((b) => b.id);
  if (ids.length) {
    const r = await prisma.band.deleteMany({ where: { id: { in: ids } } });
    console.log(`deleted ${r.count} test bands:`, bands.map((b) => b.name));
  } else {
    console.log('no test bands found');
  }
  const users = await prisma.user.findMany({ where: { username: { startsWith: 'e2e-' } } });
  if (users.length) {
    const r = await prisma.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
    console.log(`deleted ${r.count} test users`);
  } else {
    console.log('no test users found');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
