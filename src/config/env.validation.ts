import { z } from 'zod';

const NodeEnv = z.enum(['development', 'production', 'test']);

export const envSchema = z.object({
  NODE_ENV: NodeEnv.default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  LLM_API_KEY: z.string().min(1),
  WEBHOOK_SECRET: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;
