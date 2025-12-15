import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateBudgetPeriodEnum1765773470443 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {

   // Thay đổi enum từ monthly, quarterly, yearly → weekly, monthly, yearly
    await queryRunner.query(`
      ALTER TABLE \`budgets\`
      MODIFY COLUMN \`period\` enum('weekly', 'monthly', 'yearly') NOT NULL DEFAULT 'monthly'
    `);

    // Cập nhật dữ liệu cũ: nếu có giá trị 'quarterly' → chuyển thành 'monthly' hoặc 'yearly' tùy ý
    await queryRunner.query(`
      UPDATE \`budgets\`
      SET \`period\` = 'monthly'
      WHERE \`period\` = 'quarterly'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Quay lại enum cũ nếu cần revert
    await queryRunner.query(`
      ALTER TABLE \`budgets\`
      MODIFY COLUMN \`period\` enum('monthly', 'quarterly', 'yearly') NOT NULL DEFAULT 'monthly'
    `);
  }
}
