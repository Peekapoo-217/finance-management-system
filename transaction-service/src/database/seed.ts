import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { Category } from '../transaction/entities/category.entity';
import { Wallet } from '../transaction/entities/wallet.entity';
import { CategoryType } from '../transaction/enums/category-type.enum';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  console.log('🌱 Starting seed...');

  try {
    // Seed Categories
    const categoryRepo = dataSource.getRepository(Category);
    
    const categories = [
      // Income categories
      { id: uuidv4(), userId: 'test-user-id', name: 'Lương', type: CategoryType.INCOME },
      { id: uuidv4(), userId: 'test-user-id', name: 'Thưởng', type: CategoryType.INCOME },
      { id: uuidv4(), userId: 'test-user-id', name: 'Đầu tư', type: CategoryType.INCOME },
      { id: uuidv4(), userId: 'test-user-id', name: 'Kinh doanh', type: CategoryType.INCOME },
      { id: uuidv4(), userId: 'test-user-id', name: 'Thu nhập khác', type: CategoryType.INCOME },
      
      // Expense categories
      { id: uuidv4(), userId: 'test-user-id', name: 'Ăn uống', type: CategoryType.EXPENSE },
      { id: uuidv4(), userId: 'test-user-id', name: 'Giải trí', type: CategoryType.EXPENSE },
      { id: uuidv4(), userId: 'test-user-id', name: 'Mua sắm', type: CategoryType.EXPENSE },
      { id: uuidv4(), userId: 'test-user-id', name: 'Di chuyển', type: CategoryType.EXPENSE },
      { id: uuidv4(), userId: 'test-user-id', name: 'Y tế', type: CategoryType.EXPENSE },
      { id: uuidv4(), userId: 'test-user-id', name: 'Giáo dục', type: CategoryType.EXPENSE },
      { id: uuidv4(), userId: 'test-user-id', name: 'Nhà cửa', type: CategoryType.EXPENSE },
      { id: uuidv4(), userId: 'test-user-id', name: 'Hóa đơn', type: CategoryType.EXPENSE },
      { id: uuidv4(), userId: 'test-user-id', name: 'Quà tặng', type: CategoryType.EXPENSE },
      { id: uuidv4(), userId: 'test-user-id', name: 'Chi tiêu khác', type: CategoryType.EXPENSE },
    ];

    // Check if categories already exist
    const existingCount = await categoryRepo.count();
    if (existingCount === 0) {
      await categoryRepo.save(categories);
      console.log('✅ Seeded categories:', categories.length);
    } else {
      console.log('ℹ️  Categories already exist, skipping...');
    }

    // Seed Wallets
    const walletRepo = dataSource.getRepository(Wallet);
    
    const wallets = [
      {
        id: uuidv4(),
        userId: 'test-user-id',
        name: 'Ví tiền mặt',
        balance: 5000000,
        currency: 'VND',
        type: 'cash',
      },
      {
        id: uuidv4(),
        userId: 'test-user-id',
        name: 'Tài khoản ngân hàng',
        balance: 50000000,
        currency: 'VND',
        type: 'bank',
      },
      {
        id: uuidv4(),
        userId: 'test-user-id',
        name: 'Ví MoMo',
        balance: 2000000,
        currency: 'VND',
        type: 'e-wallet',
      },
    ];

    const existingWallets = await walletRepo.count();
    if (existingWallets === 0) {
      await walletRepo.save(wallets);
      console.log('✅ Seeded wallets:', wallets.length);
    } else {
      console.log('ℹ️  Wallets already exist, skipping...');
    }

    console.log('🎉 Seed completed!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
  } finally {
    await app.close();
  }
}

seed();

