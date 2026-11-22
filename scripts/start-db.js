const { default: EmbeddedPostgres } = require('embedded-postgres');
const path = require('path');
const fs = require('fs');

async function main() {
  const databaseDir = path.join(__dirname, '..', '.db_data');
  const pg = new EmbeddedPostgres({
    databaseDir,
    port: 5432,
    user: 'friday',
    password: 'friday_dev_password',
    authMethod: 'trust',
  });

  const isInitialized = fs.existsSync(path.join(databaseDir, 'PG_VERSION'));
  if (!isInitialized) {
    console.log('Initializing embedded PostgreSQL...');
    await pg.initialise();
  } else {
    console.log('Database already initialized. Skipping initdb.');
  }

  console.log('Starting PostgreSQL on port 5432...');
  await pg.start();
  console.log('PostgreSQL started on port 5432!');
  try {
    await pg.createDatabase('friday_dev');
    console.log('Database friday_dev created!');
  } catch (err) {
    console.log('createDatabase result:', err.message);
  }
  console.log('Embedded PostgreSQL is ready and accepting connections.');

  // Keep process alive
  setInterval(() => {}, 60000);
}

main().catch((err) => {
  console.error('Failed to start embedded PostgreSQL:', err);
  process.exit(1);
});
