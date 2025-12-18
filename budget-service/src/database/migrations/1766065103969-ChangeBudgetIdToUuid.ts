import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";
import { v4 as uuidv4 } from 'uuid';

export class ChangeBudgetIdToUuid1766065103969 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Kiểm tra xem bảng có tồn tại không
        const table = await queryRunner.getTable('budgets');
        if (!table) {
            console.log('Table budgets does not exist, skipping migration');
            return;
        }

        // Kiểm tra xem cột id có phải là INT không (cần migrate)
        const idColumn = table.findColumnByName('id');
        if (!idColumn) {
            console.log('Column id does not exist');
            return;
        }

        // Nếu id đã là VARCHAR thì không cần migrate
        if (idColumn.type === 'varchar' || idColumn.type === 'string') {
            console.log('Column id is already VARCHAR, skipping migration');
            return;
        }

        // Bước 1: Thêm cột id_new tạm thời
        await queryRunner.addColumn('budgets', new TableColumn({
            name: 'id_new',
            type: 'varchar',
            length: '36',
            isNullable: true,
        }));

        // Bước 2: Generate UUID cho các record hiện có
        const budgets = await queryRunner.query(`SELECT id FROM budgets`);
        for (const budget of budgets) {
            const newId = uuidv4();
            await queryRunner.query(
                `UPDATE budgets SET id_new = ? WHERE id = ?`,
                [newId, budget.id]
            );
        }

        // Bước 3: Xóa PRIMARY KEY cũ nếu có
        const primaryKey = table.primaryColumns.find(col => col.name === 'id');
        if (primaryKey) {
            await queryRunner.query(`ALTER TABLE budgets DROP PRIMARY KEY`);
        }

        // Bước 4: Xóa cột id cũ và đổi tên id_new thành id
        await queryRunner.query(`ALTER TABLE budgets DROP COLUMN id`);
        await queryRunner.query(`ALTER TABLE budgets CHANGE id_new id VARCHAR(36) NOT NULL`);
        await queryRunner.query(`ALTER TABLE budgets ADD PRIMARY KEY (id)`);

        // Bước 5: Đổi cột userId từ INT sang VARCHAR(36) nếu cần
        const userIdColumn = table.findColumnByName('userId');
        if (userIdColumn && (userIdColumn.type === 'int' || userIdColumn.type === 'integer')) {
            await queryRunner.query(`ALTER TABLE budgets MODIFY COLUMN userId VARCHAR(36) NOT NULL`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Rollback migration (không khuyến khích vì sẽ mất UUID)
        const table = await queryRunner.getTable('budgets');
        if (!table) return;

        // Đổi userId về INT
        await queryRunner.query(`ALTER TABLE budgets MODIFY COLUMN userId INT NOT NULL`);
        
        // Đổi id về INT với auto increment
        await queryRunner.addColumn('budgets', new TableColumn({
            name: 'id_old',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
        }));
        
        await queryRunner.query(`ALTER TABLE budgets DROP PRIMARY KEY`);
        await queryRunner.query(`ALTER TABLE budgets DROP COLUMN id`);
        await queryRunner.query(`ALTER TABLE budgets CHANGE id_old id INT NOT NULL`);
        await queryRunner.query(`ALTER TABLE budgets ADD PRIMARY KEY (id)`);
    }
}
