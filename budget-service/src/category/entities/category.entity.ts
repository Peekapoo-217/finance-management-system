import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { CategoryType } from '../enums/category-type.enum';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;  // Ví dụ: "Ăn uống", "Tiền lương"

  @Column({ type: 'enum', enum: CategoryType, default: CategoryType.EXPENSE })
  type: CategoryType;  // 'income' hoặc 'expense'

  @Column({ nullable: true })
  description?: string;

  @CreateDateColumn()
  createdAt: Date;
}