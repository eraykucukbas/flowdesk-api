import 'dotenv/config';
import dataSource from '../data-source';
import { Tenant } from '../../modules/tenants/entities/tenant.entity';
import { User } from '../../modules/users/entities/user.entity';
import { UserRole } from '../../modules/users/entities/user.entity';
import { Request } from '../../modules/requests/entities/request.entity';
import {
  RequestChannel,
  RequestStatus,
  RequestUrgency,
  RequestSentiment,
} from '../../modules/requests/entities/request.entity';
import { RequestEvent } from '../../modules/requests/entities/request-event.entity';
import { RequestEventType } from '../../modules/requests/entities/request-event.entity';

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seed() {
  await dataSource.initialize();
  console.log('Database connected.');

  const tenantRepo = dataSource.getRepository(Tenant);
  const userRepo = dataSource.getRepository(User);
  const requestRepo = dataSource.getRepository(Request);
  const eventRepo = dataSource.getRepository(RequestEvent);

  // Clean existing data (TRUNCATE CASCADE handles FK order)
  await dataSource.query('TRUNCATE TABLE request_events, requests, users, tenants CASCADE');

  // Tenants
  const tenants = await tenantRepo.save([
    tenantRepo.create({ name: 'Acme Corp' }),
    tenantRepo.create({ name: 'Globex Inc' }),
  ]);
  console.log(`Created ${tenants.length} tenants.`);

  // Users (2 per tenant)
  const users: User[] = [];
  for (const tenant of tenants) {
    const created = await userRepo.save([
      userRepo.create({
        tenantId: tenant.id,
        email: `admin@${tenant.slug}.com`,
        passwordHash: 'placeholder-hash',
        role: UserRole.ADMIN,
      }),
      userRepo.create({
        tenantId: tenant.id,
        email: `agent@${tenant.slug}.com`,
        passwordHash: 'placeholder-hash',
        role: UserRole.AGENT,
      }),
    ]);
    users.push(...created);
  }
  console.log(`Created ${users.length} users.`);

  // Requests (~2500 per tenant, ~5000 total)
  const channels = Object.values(RequestChannel);
  const statuses = Object.values(RequestStatus);
  const urgencies = Object.values(RequestUrgency);
  const sentiments = Object.values(RequestSentiment);
  const categories = ['BILLING', 'TECHNICAL', 'GENERAL', 'COMPLAINT', 'FEATURE_REQUEST'];

  const batchSize = 500;
  let totalRequests = 0;

  for (const tenant of tenants) {
    for (let batch = 0; batch < 5; batch++) {
      const requests: Request[] = [];
      for (let i = 0; i < batchSize; i++) {
        const idx = batch * batchSize + i;
        const request = requestRepo.create({
          tenantId: tenant.id,
          title: `Request #${idx + 1} from ${tenant.name}`,
          body: `This is a sample request body for testing. Issue number ${idx + 1}.`,
          channel: randomItem(channels),
          status: randomItem(statuses),
          category: randomItem(categories),
          urgency: randomItem(urgencies),
          sentiment: randomItem(sentiments),
        });
        requests.push(request);
      }
      const saved = await requestRepo.save(requests);
      totalRequests += saved.length;

      // Add a CREATED event for each request
      const events = saved.map((req) =>
        eventRepo.create({
          requestId: req.id,
          type: RequestEventType.CREATED,
          payload: { source: 'seed' },
        }),
      );
      await eventRepo.save(events);
    }
  }

  console.log(`Created ${totalRequests} requests with events.`);
  console.log('Seed completed.');

  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
