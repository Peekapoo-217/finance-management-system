import { Entity, PrimaryColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, BeforeInsert, Index } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Category } from '../../category/entities/category.entity';
import { BudgetPeriod } from '../enums/budget-period.enum';

@Entity('budgets')
@Index(['userId', 'categoryId'], { unique: true })
export class Budget {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  userId!: string;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column({ type: 'int' })
  categoryId: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  limitAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  spentAmount: number;

  @Column({ type: 'enum', enum: BudgetPeriod, default: BudgetPeriod.MONTHLY })
  period: BudgetPeriod;

  @CreateDateColumn()
  createdAt: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }
}