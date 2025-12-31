import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSessionEntity1734349400000 implements MigrationInterface {
    name = 'AddSessionEntity1734349400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create sessions table
        await queryRunner.query(`
            CREATE TABLE "sessions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" integer NOT NULL,
                "refreshTokenHash" character varying NOT NULL,
                "userAgent" character varying,
                "ipAddress" character varying,
                "expiresAt" TIMESTAMP NOT NULL,
                "isRevoked" boolean NOT NULL DEFAULT false,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_sessions_id" PRIMARY KEY ("id")
            )
        `);

        // Add foreign key constraint to User
        await queryRunner.query(`
            ALTER TABLE "sessions" 
            ADD CONSTRAINT "FK_sessions_userId" 
            FOREIGN KEY ("userId") 
            REFERENCES "user"("id") 
            ON DELETE CASCADE 
            ON UPDATE NO ACTION
        `);

        // Add composite index for userId and isRevoked
        await queryRunner.query(`CREATE INDEX "IDX_session_userId_isRevoked" ON "sessions" ("userId", "isRevoked") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop index
        await queryRunner.query(`DROP INDEX "public"."IDX_session_userId_isRevoked"`);

        // Drop foreign key constraint
        await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT "FK_sessions_userId"`);

        // Drop sessions table
        await queryRunner.query(`DROP TABLE "sessions"`);
    }
}
