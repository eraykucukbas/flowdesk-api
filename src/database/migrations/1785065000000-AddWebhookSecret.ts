import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWebhookSecret1785065000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto
    `);

    await queryRunner.query(`
      ALTER TABLE tenants
      ADD COLUMN webhook_secret VARCHAR NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex')
    `);

    await queryRunner.query(`
      ALTER TABLE tenants ALTER COLUMN webhook_secret DROP DEFAULT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tenants DROP COLUMN webhook_secret
    `);
  }
}
