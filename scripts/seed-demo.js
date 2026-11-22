const { PrismaClient } = require('@prisma/client');
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
      createdById: user.id,
    },
  });
  console.log('Band:', band.name, band.id);

  const membership = await prisma.bandMembership.upsert({
    where: { userId_bandId: { userId: user.id, bandId: band.id } },
    update: {},
    create: {
      userId: user.id,
      bandId: band.id,
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
      bandId: band.id,
      title: 'Friday Platform Architecture & Vision',
      content: '# Friday — Collaborative Software Engineering Workspace\n\nWelcome to Friday. This demo workspace allows you to plan, visualise, and build together in real time.',
      status: 'APPROVED',
      version: 1,
    },
  });
  console.log('PRD:', prd.title);

  // Add demo Architecture
  const arch = await prisma.architecture.upsert({
    where: { bandId: band.id },
    update: {},
    create: {
      bandId: band.id,
      name: 'System Architecture',
      description: 'Core microservices and event pipelines',
    },
  });
  console.log('Architecture:', arch.name);

  // Add demo tasks
  const taskCount = await prisma.task.count({ where: { bandId: band.id } });
  if (taskCount === 0) {
    await prisma.task.createMany({
      data: [
        {
          bandId: band.id,
          title: 'Establish Realtime Event Mesh',
          description: 'Socket.IO event bus for cross-band collaboration',
          status: 'COMPLETED',
          priority: 'CRITICAL',
          createdById: user.id,
        },
        {
          bandId: band.id,
          title: 'Integrate Monaco Editor for Live Code Inspection',
          description: 'Provide synchronous code browsing with syntax highlighting',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          createdById: user.id,
        },
        {
          bandId: band.id,
          title: 'Automated Traceability Validation',
          description: 'Trace requirements from PRD through Architecture down to Commits',
          status: 'TODO',
          priority: 'MEDIUM',
          createdById: user.id,
        },
      ],
    });
    console.log('Created demo tasks');
  }

  // Create demo ClientPublication
  await prisma.clientPublication.upsert({
    where: { bandId: band.id },
    update: {},
    create: {
      bandId: band.id,
      slug: 'demo',
      title: 'Friday Platform Client Preview',
      isPublic: true,
      snapshotData: {
        summary: 'Demo milestone for Friday Core Platform',
        milestone: 'v0.1.0 MVP',
      },
    },
  });
  console.log('Client publication created: /client/demo');

  await prisma.$disconnect();
  console.log('Demo data seeded successfully!');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
