import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  OneToMany,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Transaction } from './transaction.entity';
import { CategoryType } from '../enums';

@Entity('categories')
export class Category {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  userId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({
    type: 'enum',
    enum: CategoryType,
  })
  type!: CategoryType;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Transaction, (transaction) => transaction.category)
  transactions!: Transaction[];

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }
}

