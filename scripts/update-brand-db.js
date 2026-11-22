const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    let newUsername = u.username.replace(/friday/gi, 'weday');
    if (newUsername.includes('dmin')) newUsername = i === 0 ? 'weday-admin' : `weday-admin-${i}`;
    let newDisplay = (u.displayName || u.username).replace(/friday/gi, 'WEday');
    let newEmail = `${newUsername}@weday.local`;
    let newAvatar = u.avatarUrl ? u.avatarUrl.replace(/friday/gi, 'weday') : `https://api.dicebear.com/7.x/bottts/svg?seed=${newUsername}`;

    await prisma.user.update({
      where: { id: u.id },
      data: {
        username: newUsername,
        displayName: newDisplay,
        email: newEmail,
        avatarUrl: newAvatar,
      },
    });
    console.log(`Updated user: ${u.username} -> ${newUsername} (${newDisplay}) <${newEmail}>`);
  }

  await prisma.band.updateMany({
    where: { slug: { in: ['friday-core', 'weday-core'] } },
    data: {
      name: 'WEday Core',
      slug: 'weday-core',
      description: 'Main collaborative workspace demo project',
    },
  });

  console.log('Database updated successfully!');
  await prisma.$disconnect();
}

main().catch(console.error);
