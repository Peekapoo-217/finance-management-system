import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBudgetTable1765621187969 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`budgets\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`userId\` int NOT NULL,
        \`categoryId\` int NOT NULL,
        \`limitAmount\` decimal(15,2) NOT NULL,
        \`spentAmount\` decimal(15,2) NOT NULL DEFAULT '0.00',
        \`period\` enum('monthly', 'quarterly', 'yearly') NOT NULL DEFAULT 'monthly',
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`budgets\``);
  }
}
