import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log('No user found');
    return;
  }
  console.log('Found user:', user.username, user.id);

  const band = await prisma.band.upsert({
    where: { slug: 'friday-core' },
    update: {},
    create: {
      name: 'Friday Core',
      slug: 'friday-core',
      description: 'Main collaborative workspace demo project',
      joinCode: 'FRIDAY1',
      creator: { connect: { id: user.id } },
    },
  });
  console.log('Band:', band.name, band.id);

  const membership = await prisma.bandMembership.upsert({
    where: { userId_bandId: { userId: user.id, bandId: band.id } },
    update: {},
    create: {
      user: { connect: { id: user.id } },
      band: { connect: { id: band.id } },
      role: 'ADMIN',
      signatureColor: '#00F0FF',
    },
  });
  console.log('Membership:', membership.role);

  // Add demo PRD
  const prd = await prisma.pRD.upsert({
    where: { bandId: band.id },
    update: {},
    create: {
      band: { connect: { id: band.id } },
      title: 'Friday Platform Architecture & Vision',
      versions: {
        create: {
          versionNumber: 1,
          title: 'Initial Draft v1.0',
          content: '# Friday — Collaborative Software Engineering Workspace\n\nWelcome to Friday. This demo workspace allows you to plan, visualise, and build together in real time.',
          createdById: user.id,
        },
      },
    },
  });
  console.log('PRD:', prd.title);

  // Add demo Architecture
  const arch = await prisma.architecture.upsert({
    where: { bandId: band.id },
    update: {},
    create: {
      band: { connect: { id: band.id } },
    },
  });
  console.log('Architecture:', arch.id);

  // Add demo tasks
  const taskCount = await prisma.task.count({ where: { bandId: band.id } });
  if (taskCount === 0) {
    await prisma.task.create({
      data: {
        band: { connect: { id: band.id } },
        title: 'Establish Realtime Event Mesh',
        description: 'Socket.IO event bus for cross-band collaboration',
        status: 'DONE',
        priority: 'CRITICAL',
        creator: { connect: { id: user.id } },
      },
    });
    await prisma.task.create({
      data: {
        band: { connect: { id: band.id } },
        title: 'Integrate Monaco Editor for Live Code Inspection',
        description: 'Provide synchronous code browsing with syntax highlighting',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        creator: { connect: { id: user.id } },
      },
    });
    console.log('Created demo tasks');
  }

  // Create demo ClientPublication
  const pub = await prisma.clientPublication.upsert({
    where: { bandId: band.id },
    update: {},
    create: {
      band: { connect: { id: band.id } },
      publicSlug: 'demo',
      isPasswordProtected: false,
    },
  });
  console.log('Client publication created:', pub.publicSlug);

  const versionCount = await prisma.clientPublicationVersion.count({ where: { publicationId: pub.id } });
  if (versionCount === 0) {
    await prisma.clientPublicationVersion.create({
      data: {
        publication: { connect: { id: pub.id } },
        versionNumber: 1,
        title: 'Friday MVP Preview',
        summary: 'Demo milestone for Friday Core Platform',
        snapshotData: {
          summary: 'Friday collaborative platform MVP milestone',
          milestone: 'v0.1.0',
        },
        publishedBy: { connect: { id: user.id } },
      },
    });
  }

  await prisma.$disconnect();
  console.log('Demo data seeded successfully!');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
