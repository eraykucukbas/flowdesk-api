import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIndexes1784816151564 implements MigrationInterface {
    name = 'AddIndexes1784816151564'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_e8b717bcc3e01fbd300f4e97e5" ON "request_events" ("request_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_d282a543478904171bf1ab2307" ON "requests" ("tenant_id", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_483d0e2252bd9a3343932a3b23" ON "requests" ("tenant_id", "created_at") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_483d0e2252bd9a3343932a3b23"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d282a543478904171bf1ab2307"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e8b717bcc3e01fbd300f4e97e5"`);
    }

}
