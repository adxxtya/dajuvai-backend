import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVersionColumns1734349300000 implements MigrationInterface {
    name = 'AddVersionColumns1734349300000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add version column to Product entity for optimistic locking
        await queryRunner.query(`ALTER TABLE "products" ADD "version" integer NOT NULL DEFAULT 1`);

        // Add version column to Variant entity for optimistic locking
        await queryRunner.query(`ALTER TABLE "variants" ADD "version" integer NOT NULL DEFAULT 1`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove version columns
        await queryRunner.query(`ALTER TABLE "variants" DROP COLUMN "version"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "version"`);
    }
}
