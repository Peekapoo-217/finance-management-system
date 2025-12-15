import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Category } from '../../category/entities/category.entity';
import { BudgetPeriod } from '../enums/budget-period.enum';  

@Entity('budgets')
export class Budget {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  userId: number;

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
}