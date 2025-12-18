import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey } from "typeorm";

export class CreateUserTable1765804229458 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Tạo bảng categories trước
        await queryRunner.createTable(
            new Table({
                name: 'categories',
                columns: [
                    {
                        name: 'id',
                        type: 'int',
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: 'increment',
                    },
                    {
                        name: 'name',
                        type: 'varchar',
                        length: '255',
                        isUnique: true,
                    },
                    {
                        name: 'type',
                        type: 'enum',
                        enum: ['income', 'expense'],
                        default: "'expense'",
                    },
                    {
                        name: 'description',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'createdAt',
                        type: 'datetime',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
            }),
            true
        );

        // Tạo bảng budgets
        await queryRunner.createTable(
            new Table({
                name: 'budgets',
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
                        name: 'categoryId',
                        type: 'int',
                    },
                    {
                        name: 'limitAmount',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                    },
                    {
                        name: 'spentAmount',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        default: 0,
                    },
                    {
                        name: 'period',
                        type: 'enum',
                        enum: ['weekly', 'monthly', 'yearly'],
                        default: "'monthly'",
                    },
                    {
                        name: 'createdAt',
                        type: 'datetime',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
            }),
            true
        );

        // Tạo foreign key từ budgets đến categories
        await queryRunner.createForeignKey(
            'budgets',
            new TableForeignKey({
                columnNames: ['categoryId'],
                referencedColumnNames: ['id'],
                referencedTableName: 'categories',
                onDelete: 'RESTRICT',
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Xóa foreign key trước
        const table = await queryRunner.getTable('budgets');
        if (table) {
            const foreignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf('categoryId') !== -1);
            if (foreignKey) {
                await queryRunner.dropForeignKey('budgets', foreignKey);
            }
        }

        // Xóa bảng budgets
        await queryRunner.dropTable('budgets', true);

        // Xóa bảng categories
        await queryRunner.dropTable('categories', true);
    }
}
