import { MigrationInterface, QueryRunner } from "typeorm";

export class TransactionDb1765431194053 implements MigrationInterface {
    name = 'TransactionDb1765431194053'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`categories\` (
          \`id\` varchar(36) NOT NULL,
          \`userId\` varchar(36) NOT NULL,
          \`name\` varchar(100) NOT NULL,
          \`type\` enum('income', 'expense') NOT NULL DEFAULT 'expense',
          \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB`);

        await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`transactions\` (
          \`id\` varchar(36) NOT NULL,
          \`userId\` varchar(36) NOT NULL,
          \`walletId\` varchar(36) NOT NULL,
          \`categoryId\` varchar(36) NOT NULL,
          \`amount\` decimal(15,2) NOT NULL,
          \`transactionDate\` date NOT NULL,
          \`description\` varchar(255) NULL,
          \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB`);

        await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`wallets\` (
          \`id\` varchar(36) NOT NULL,
          \`userId\` varchar(36) NOT NULL,
          \`name\` varchar(100) NOT NULL,
          \`balance\` decimal(15,2) NOT NULL DEFAULT '0.00',
          \`currency\` varchar(10) NOT NULL DEFAULT 'VND',
          \`type\` varchar(50) NULL,
          \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB`);

        await queryRunner.query(`ALTER TABLE \`transactions\` 
          ADD CONSTRAINT \`FK_a88f466d39796d3081cf96e1b66\` 
          FOREIGN KEY (\`walletId\`) REFERENCES \`wallets\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);

        await queryRunner.query(`ALTER TABLE \`transactions\` 
          ADD CONSTRAINT \`FK_86e965e74f9cc66149cf6c90f64\` 
          FOREIGN KEY (\`categoryId\`) REFERENCES \`categories\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`transactions\` DROP FOREIGN KEY \`FK_86e965e74f9cc66149cf6c90f64\``);
        await queryRunner.query(`ALTER TABLE \`transactions\` DROP FOREIGN KEY \`FK_a88f466d39796d3081cf96e1b66\``);
        await queryRunner.query(`DROP TABLE \`wallets\``);
        await queryRunner.query(`DROP TABLE \`transactions\``);
        await queryRunner.query(`DROP TABLE \`categories\``);
    }
}