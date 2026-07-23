import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Request } from '../../modules/requests/entities/request.entity';
import { RequestEvent } from '../../modules/requests/entities/request-event.entity';
import { Tenant } from '../../modules/tenants/entities/tenant.entity';
import { User } from '../../modules/users/entities/user.entity';

// Custom logger that counts queries
class QueryCounter {
  count = 0;

  reset() {
    this.count = 0;
  }

  logQuery() {
    this.count++;
  }

  logQueryError() {}
  logQuerySlow() {}
  logSchemaBuild() {}
  logMigration() {}
  log() {}
}

async function demo() {
  const counter = new QueryCounter();

  const ds = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [Tenant, User, Request, RequestEvent],
    logger: counter,
    synchronize: false,
  });

  await ds.initialize();

  const requestRepo = ds.getRepository(Request);
  const eventRepo = ds.getRepository(RequestEvent);
  const tenantRepo = ds.getRepository(Tenant);

  const tenant = await tenantRepo.findOneBy({ slug: 'acme-corp' });
  if (!tenant) throw new Error('Run seed first');

  // ============================================
  // BAD: N+1 problem
  // ============================================
  console.log('\n=== N+1 PROBLEM (BAD) ===\n');

  counter.reset();

  const requests = await requestRepo.find({
    where: { tenantId: tenant.id },
    take: 20,
  });

  // This loop fires a separate query for EACH request
  for (const req of requests) {
    req.events = await eventRepo.find({ where: { requestId: req.id } });
  }

  console.log(`Fetched ${requests.length} requests with events`);
  console.log(`Total queries: ${counter.count}`);
  console.log(`(1 for requests + ${requests.length} for events = ${1 + requests.length} expected)\n`);

  // ============================================
  // GOOD: Single query with relations
  // ============================================
  console.log('=== SOLVED WITH JOIN (GOOD) ===\n');

  counter.reset();

  const requestsWithEvents = await requestRepo.find({
    where: { tenantId: tenant.id },
    relations: ['events'],
    take: 20,
  });

  console.log(`Fetched ${requestsWithEvents.length} requests with events`);
  console.log(`Total queries: ${counter.count}\n`);

  await ds.destroy();
}

demo().catch((err) => {
  console.error('Demo failed:', err);
  process.exit(1);
});
