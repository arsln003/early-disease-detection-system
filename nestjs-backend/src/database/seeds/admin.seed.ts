// src/database/seeds/admin.seed.ts
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Admin } from 'src/entities/entities/Admin';

export async function seedAdmins(dataSource: DataSource): Promise<void> {
  const adminRepo = dataSource.getRepository(Admin);

  const admins = [
    {
      fullname: 'Super Admin',
      email: 'superadmin@hospital.com',
      password: 'Admin@123',
      contactnumber: '03001234567',
    },
    {
      fullname: 'Admin Two',
      email: 'admin2@hospital.com',
      password: 'Admin@456',
      contactnumber: '03007654321',
    },
    {
      fullname: 'Admin Three',
      email: 'admin3@hospital.com',
      password: 'Admin@789',
      contactnumber: '03009876543',
    },
  ];

  for (const adminData of admins) {
    // check if admin already exists — don't create duplicates
    const exists = await adminRepo.findOne({
      where: { email: adminData.email },
    });

    if (exists) {
      console.log(`⚠️  Admin already exists: ${adminData.email}`);
      continue;
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(adminData.password, salt);

    const admin = adminRepo.create({
      ...adminData,
      password: hashedPassword,
    });

    await adminRepo.save(admin);
    console.log(`✅ Admin created: ${adminData.email}`);
  }
}