import { DataSource } from 'typeorm';
import { Category } from '../../category/entities/category.entity';
import { CategoryType } from '../../category/enums/category-type.enum';

export async function seedCategories(dataSource: DataSource): Promise<void> {
  const categoryRepository = dataSource.getRepository(Category);

  // Check if categories already exist
  const existingCount = await categoryRepository.count();
  if (existingCount > 0) {
    console.log('Categories already seeded, skipping...');
    return;
  }

  const categories = [
    // Income categories
    { name: 'Lương', type: CategoryType.INCOME, description: 'Thu nhập từ lương tháng' },
    { name: 'Thưởng', type: CategoryType.INCOME, description: 'Tiền thưởng, phụ cấp từ công ty' },
    { name: 'Đầu tư', type: CategoryType.INCOME, description: 'Lợi nhuận từ đầu tư, cổ tức' },
    { name: 'Kinh doanh', type: CategoryType.INCOME, description: 'Thu nhập từ kinh doanh cá nhân' },
    { name: 'Thu nhập khác', type: CategoryType.INCOME, description: 'Các khoản thu nhập khác' },

    // Expense categories
    { name: 'Ăn uống', type: CategoryType.EXPENSE, description: 'Chi phí ăn uống hàng ngày' },
    { name: 'Mua sắm', type: CategoryType.EXPENSE, description: 'Mua quần áo, đồ dùng cá nhân' },
    { name: 'Du lịch', type: CategoryType.EXPENSE, description: 'Chi phí du lịch, nghỉ dưỡng' },
    { name: 'Giải trí', type: CategoryType.EXPENSE, description: 'Xem phim, cafe, vui chơi' },
    { name: 'Y tế', type: CategoryType.EXPENSE, description: 'Khám bệnh, mua thuốc' },
    { name: 'Giáo dục', type: CategoryType.EXPENSE, description: 'Học phí, sách vở, khóa học' },
    { name: 'Giao thông', type: CategoryType.EXPENSE, description: 'Xăng xe, vé xe, taxi' },
    { name: 'Nhà ở', type: CategoryType.EXPENSE, description: 'Tiền nhà, điện nước, internet' },
    { name: 'Gia đình', type: CategoryType.EXPENSE, description: 'Chi phí cho gia đình, con cái' },
    { name: 'Chi phí khác', type: CategoryType.EXPENSE, description: 'Các chi phí khác' },
  ];

  console.log(`Seeding ${categories.length} categories...`);

  for (const categoryData of categories) {
    const category = categoryRepository.create(categoryData);
    await categoryRepository.save(category);
    console.log(`✓ Created category: ${categoryData.name} (${categoryData.type})`);
  }

  console.log('Categories seeded successfully!');
}

