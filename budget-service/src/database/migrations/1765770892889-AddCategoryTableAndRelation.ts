import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCategoryTableAndRelation1765770892889 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Tạo bảng categories
        await queryRunner.query(`
          CREATE TABLE \`categories\` (
            \`id\` int NOT NULL AUTO_INCREMENT,
            \`name\` varchar(255) NOT NULL,
            \`type\` enum('income', 'expense') NOT NULL DEFAULT 'expense',
            \`description\` varchar(255) NULL,
            \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            UNIQUE KEY \`IDX_category_name\` (\`name\`),
            PRIMARY KEY (\`id\`)
          ) ENGINE=InnoDB
        `);

        // Thêm foreign key cho bảng budgets (nếu chưa có)
        await queryRunner.query(`
          ALTER TABLE \`budgets\`
          ADD CONSTRAINT \`FK_budget_category\`
          FOREIGN KEY (\`categoryId\`) REFERENCES \`categories\`(\`id\`) ON DELETE SET NULL
        `);

        // Insert dữ liệu mẫu
        await queryRunner.query(`
          INSERT INTO \`categories\` (\`name\`, \`type\`) VALUES
          ('Tiền lương', 'income'),
          ('Tiền thưởng', 'income'),
          ('Tiền làm thêm', 'income'),
          ('Ăn uống', 'expense'),
          ('Du lịch', 'expense'),
          ('Giải trí', 'expense'),
          ('Mua sắm', 'expense'),
          ('Hóa đơn', 'expense'),
          ('Tiết kiệm', 'expense')
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Xóa foreign key trước
        await queryRunner.query(`ALTER TABLE \`budgets\` DROP FOREIGN KEY \`FK_budget_category\``);
        // Xóa bảng categories
        await queryRunner.query(`DROP TABLE \`categories\``);
    }
}