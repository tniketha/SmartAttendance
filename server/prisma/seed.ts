import { PrismaClient, Role, AttendanceStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production' || process.env.ALLOW_DEMO_RESET !== 'true') throw new Error('Set ALLOW_DEMO_RESET=true only for a disposable development database');
  console.log('🌱 Starting database seeding...');

  // Clean existing records in reverse dependency order
  await prisma.attendanceReviewRequest.deleteMany();
  await prisma.attendanceAuditLog.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.attendanceSession.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.module.deleteMany();
  await prisma.student.deleteMany();
  await prisma.lecturer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create Department
  const department = await prisma.department.create({
    data: {
      name: 'Department of Physical Science',
      code: 'DPS',
    },
  });
  console.log(`✓ Created Department: ${department.name}`);

  // 2. Create Admin User
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@univ.ac.lk',
      name: 'System Administrator',
      passwordHash,
      role: Role.ADMIN,
    },
  });
  console.log(`✓ Created Admin: ${adminUser.email}`);

  // 3. Create Lecturer
  const lecturerUser = await prisma.user.create({
    data: {
      email: 'lecturer@univ.ac.lk',
      name: 'Dr. Robert Smith',
      passwordHash,
      role: Role.LECTURER,
    },
  });

  const lecturer = await prisma.lecturer.create({
    data: {
      userId: lecturerUser.id,
      employeeNumber: 'EMP001',
      departmentId: department.id,
      title: 'Senior Lecturer',
    },
  });
  console.log(`✓ Created Lecturer: ${lecturerUser.name} (${lecturer.employeeNumber})`);

  // 4. Create Modules
  const modulesData = [
    {
      moduleCode: 'CSC3213',
      moduleName: 'Computer Architecture',
      academicYear: 'Year 3',
      semester: 1,
    },
    {
      moduleCode: 'CSH3153',
      moduleName: 'Human Computer Interaction',
      academicYear: 'Year 3',
      semester: 1,
    },
    {
      moduleCode: 'CSC3112',
      moduleName: 'Computer Graphics',
      academicYear: 'Year 3',
      semester: 1,
    },
  ];

  const createdModules = [];
  for (const m of modulesData) {
    const mod = await prisma.module.create({
      data: {
        moduleCode: m.moduleCode,
        moduleName: m.moduleName,
        departmentId: department.id,
        lecturerId: lecturer.id,
        academicYear: m.academicYear,
        semester: m.semester,
      },
    });
    createdModules.push(mod);
    console.log(`✓ Created Module: ${mod.moduleCode} - ${mod.moduleName}`);
  }

  // 5. Create Students
  const studentsList = [
    { id: 'STU001', name: 'Nimal Perera', email: 'stu001@student.univ.ac.lk' },
    { id: 'STU002', name: 'Kamal Silva', email: 'stu002@student.univ.ac.lk' },
    { id: 'STU003', name: 'Amal Fernando', email: 'stu003@student.univ.ac.lk' },
    { id: 'STU004', name: 'Sunil Jayawardena', email: 'stu004@student.univ.ac.lk' },
    { id: 'STU005', name: 'Kasun Bandara', email: 'stu005@student.univ.ac.lk' },
    { id: 'STU006', name: 'Dilani Wickramasinghe', email: 'stu006@student.univ.ac.lk' },
    { id: 'STU007', name: 'Ruwan Dissanayake', email: 'stu007@student.univ.ac.lk' },
    { id: 'STU008', name: 'Anura Gunasekara', email: 'stu008@student.univ.ac.lk' },
    { id: 'STU009', name: 'Chathuri Senanayake', email: 'stu009@student.univ.ac.lk' },
    { id: 'STU010', name: 'Mahesh Thilakarathne', email: 'stu010@student.univ.ac.lk' },
  ];

  const createdStudents = [];
  for (const s of studentsList) {
    const user = await prisma.user.create({
      data: {
        email: s.email,
        name: s.name,
        passwordHash,
        role: Role.STUDENT,
      },
    });

    const student = await prisma.student.create({
      data: {
        userId: user.id,
        studentNumber: s.id,
        departmentId: department.id,
        programme: 'BSc Honours in Computer Science',
        academicYear: 'Year 3',
        batch: '2023/2024',
      },
    });
    createdStudents.push(student);

    // Enroll in all 3 modules
    for (const mod of createdModules) {
      await prisma.enrollment.create({
        data: {
          studentId: student.id,
          moduleId: mod.id,
        },
      });
    }
  }
  console.log(`✓ Created ${createdStudents.length} Students and enrolled each in ${createdModules.length} Modules`);

  console.log('\n🎉 Database seeding completed successfully!');
  console.log('----------------------------------------------------');
  console.log('Default Credentials (Password for all: password123):');
  console.log('Lecturer: lecturer@univ.ac.lk');
  console.log('Students: stu001@student.univ.ac.lk ... stu010@student.univ.ac.lk');
  console.log('Admin:    admin@univ.ac.lk');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
