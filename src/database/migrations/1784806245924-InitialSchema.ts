import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1784806245924 implements MigrationInterface {
    name = 'InitialSchema1784806245924'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE TYPE "public"."request_events_type_enum" AS ENUM('CREATED', 'LLM_CLASSIFIED', 'STATUS_CHANGED')`);
        await queryRunner.query(`CREATE TABLE "request_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "request_id" uuid NOT NULL, "type" "public"."request_events_type_enum" NOT NULL, "payload" jsonb NOT NULL DEFAULT '{}', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_bf9333ddb0c34f1533239fc9cb0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."requests_channel_enum" AS ENUM('EMAIL', 'PHONE', 'WEB', 'CHAT')`);
        await queryRunner.query(`CREATE TYPE "public"."requests_status_enum" AS ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')`);
        await queryRunner.query(`CREATE TYPE "public"."requests_urgency_enum" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')`);
        await queryRunner.query(`CREATE TYPE "public"."requests_sentiment_enum" AS ENUM('POSITIVE', 'NEUTRAL', 'NEGATIVE')`);
        await queryRunner.query(`CREATE TABLE "requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "title" character varying NOT NULL, "body" text NOT NULL, "channel" "public"."requests_channel_enum" NOT NULL, "status" "public"."requests_status_enum" NOT NULL DEFAULT 'OPEN', "category" character varying, "urgency" "public"."requests_urgency_enum", "sentiment" "public"."requests_sentiment_enum", "external_message_id" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_883f28204fd457ee23210413d55" UNIQUE ("external_message_id"), CONSTRAINT "PK_0428f484e96f9e6a55955f29b5f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "tenants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "slug" character varying NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_2310ecc5cb8be427097154b18fc" UNIQUE ("slug"), CONSTRAINT "PK_53be67a04681c66b87ee27c9321" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('ADMIN', 'AGENT')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "email" character varying NOT NULL, "password_hash" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "request_events" ADD CONSTRAINT "FK_e8b717bcc3e01fbd300f4e97e56" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "requests" ADD CONSTRAINT "FK_f404bc4cead28da5372fc34c9c7" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_109638590074998bb72a2f2cf08" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_109638590074998bb72a2f2cf08"`);
        await queryRunner.query(`ALTER TABLE "requests" DROP CONSTRAINT "FK_f404bc4cead28da5372fc34c9c7"`);
        await queryRunner.query(`ALTER TABLE "request_events" DROP CONSTRAINT "FK_e8b717bcc3e01fbd300f4e97e56"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP TABLE "tenants"`);
        await queryRunner.query(`DROP TABLE "requests"`);
        await queryRunner.query(`DROP TYPE "public"."requests_sentiment_enum"`);
        await queryRunner.query(`DROP TYPE "public"."requests_urgency_enum"`);
        await queryRunner.query(`DROP TYPE "public"."requests_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."requests_channel_enum"`);
        await queryRunner.query(`DROP TABLE "request_events"`);
        await queryRunner.query(`DROP TYPE "public"."request_events_type_enum"`);
    }

}
