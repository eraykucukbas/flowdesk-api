import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClassificationFailedEvent1785070000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE request_events_type_enum ADD VALUE IF NOT EXISTS 'CLASSIFICATION_FAILED'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing enum values
  }
}
