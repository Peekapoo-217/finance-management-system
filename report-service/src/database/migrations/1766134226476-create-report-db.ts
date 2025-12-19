import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateReportDb1766134226476 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Tạo bảng reports
        await queryRunner.createTable(
            new Table({
                name: 'reports',
                columns: [
                    {
                        name: 'id',
                        type: 'varchar',
                        length: '36',
                        isPrimary: true,
                    },
                    {
                        name: 'userId',
                        type: 'varchar',
                        length: '36',
                    },
                    {
                        name: 'period',
                        type: 'varchar',
                        length: '50',
                    },
                    {
                        name: 'dataJson',
                        type: 'text',
                    },
                    {
                        name: 'generatedDate',
                        type: 'datetime',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
            }),
            true
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Xóa bảng reports
        await queryRunner.dropTable('reports');
    }

}
