import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIndexes1734349200000 implements MigrationInterface {
    name = 'AddIndexes1734349200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add indexes to User entity
        await queryRunner.query(`CREATE INDEX "IDX_user_email" ON "user" ("email") `);
        await queryRunner.query(`CREATE INDEX "IDX_user_phoneNumber" ON "user" ("phoneNumber") `);
        await queryRunner.query(`CREATE INDEX "IDX_user_email_isVerified" ON "user" ("email", "isVerified") `);

        // Add indexes to Product entity
        await queryRunner.query(`CREATE INDEX "IDX_product_name" ON "products" ("name") `);
        await queryRunner.query(`CREATE INDEX "IDX_product_stock" ON "products" ("stock") `);
        await queryRunner.query(`CREATE INDEX "IDX_product_vendorId_subcategoryId" ON "products" ("vendorId", "subcategoryId") `);

        // Add indexes to Order entity
        await queryRunner.query(`CREATE INDEX "IDX_order_orderedById_status" ON "orders" ("orderedById", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_order_paymentStatus" ON "orders" ("paymentStatus") `);
        await queryRunner.query(`CREATE INDEX "IDX_order_createdAt" ON "orders" ("createdAt") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove Order indexes
        await queryRunner.query(`DROP INDEX "public"."IDX_order_createdAt"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_order_paymentStatus"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_order_orderedById_status"`);

        // Remove Product indexes
        await queryRunner.query(`DROP INDEX "public"."IDX_product_vendorId_subcategoryId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_product_stock"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_product_name"`);

        // Remove User indexes
        await queryRunner.query(`DROP INDEX "public"."IDX_user_email_isVerified"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_user_phoneNumber"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_user_email"`);
    }
}
