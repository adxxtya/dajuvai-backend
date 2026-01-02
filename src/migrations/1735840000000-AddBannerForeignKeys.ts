import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from "typeorm";

export class AddBannerForeignKeys1735840000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add selectedCategoryId column
        await queryRunner.addColumn("banners", new TableColumn({
            name: "selectedCategoryId",
            type: "integer",
            isNullable: true
        }));

        // Add selectedSubcategoryId column
        await queryRunner.addColumn("banners", new TableColumn({
            name: "selectedSubcategoryId",
            type: "integer",
            isNullable: true
        }));

        // Add selectedDealId column
        await queryRunner.addColumn("banners", new TableColumn({
            name: "selectedDealId",
            type: "integer",
            isNullable: true
        }));

        // Add foreign key for selectedCategoryId
        await queryRunner.createForeignKey("banners", new TableForeignKey({
            columnNames: ["selectedCategoryId"],
            referencedColumnNames: ["id"],
            referencedTableName: "category",
            onDelete: "SET NULL"
        }));

        // Add foreign key for selectedSubcategoryId
        await queryRunner.createForeignKey("banners", new TableForeignKey({
            columnNames: ["selectedSubcategoryId"],
            referencedColumnNames: ["id"],
            referencedTableName: "subcategory",
            onDelete: "SET NULL"
        }));

        // Add foreign key for selectedDealId
        await queryRunner.createForeignKey("banners", new TableForeignKey({
            columnNames: ["selectedDealId"],
            referencedColumnNames: ["id"],
            referencedTableName: "deals",
            onDelete: "SET NULL"
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign keys
        const table = await queryRunner.getTable("banners");
        
        const categoryForeignKey = table?.foreignKeys.find(fk => fk.columnNames.indexOf("selectedCategoryId") !== -1);
        if (categoryForeignKey) {
            await queryRunner.dropForeignKey("banners", categoryForeignKey);
        }

        const subcategoryForeignKey = table?.foreignKeys.find(fk => fk.columnNames.indexOf("selectedSubcategoryId") !== -1);
        if (subcategoryForeignKey) {
            await queryRunner.dropForeignKey("banners", subcategoryForeignKey);
        }

        const dealForeignKey = table?.foreignKeys.find(fk => fk.columnNames.indexOf("selectedDealId") !== -1);
        if (dealForeignKey) {
            await queryRunner.dropForeignKey("banners", dealForeignKey);
        }

        // Drop columns
        await queryRunner.dropColumn("banners", "selectedCategoryId");
        await queryRunner.dropColumn("banners", "selectedSubcategoryId");
        await queryRunner.dropColumn("banners", "selectedDealId");
    }
}
