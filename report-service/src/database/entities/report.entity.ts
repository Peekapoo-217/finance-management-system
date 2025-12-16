import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 50 })
  period: string;  // e.g., '2025-01'

  @Column({ type: 'text' })
  dataJson: string;  

  @CreateDateColumn()
  generatedDate: Date;
}