# Database Seeding

## Chạy Seeder

### 1. Seed Categories vào database:

```bash
cd budget-service
npm run seed
```

Lệnh này sẽ tạo 15 categories mặc định:
- **Income (5):** Lương, Thưởng, Đầu tư, Kinh doanh, Thu nhập khác
- **Expense (10):** Ăn uống, Mua sắm, Du lịch, Giải trí, Y tế, Giáo dục, Giao thông, Nhà ở, Gia đình, Chi phí khác

### 2. Kiểm tra kết quả:

```bash
# Qua API
GET http://localhost:3002/categories

# Hoặc trực tiếp database
mysql -u root -p finance_budget_service
SELECT * FROM categories;
```

---

## Xóa Seeder (sau khi đã seed)

Khi đã seed xong và không cần nữa, xóa các file:

```bash
cd budget-service

# Xóa seeder files
rm src/database/seeders/category.seeder.ts
rm src/database/seed.ts
rm SEED-README.md

# Xóa script trong package.json
# Tìm và xóa dòng: "seed": "ts-node ..."
```

---

## Notes

- Seeder chỉ chạy 1 lần (có check `existingCount`)
- Nếu muốn seed lại, xóa hết categories trong DB trước
- Categories này là CỨNG, dùng chung cho tất cả users
- Sau này có thể refactor để user tự tạo categories riêng

---

## Troubleshooting

### Lỗi: "Cannot find module"
```bash
# Cài đặt ts-node nếu chưa có
npm install --save-dev ts-node tsconfig-paths
```

### Lỗi: "Database connection failed"
- Kiểm tra file `.env` có đúng DB config không
- Kiểm tra MySQL server đang chạy
- Kiểm tra database `finance_budget_service` đã tồn tại chưa

