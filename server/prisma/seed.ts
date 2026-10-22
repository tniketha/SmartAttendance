import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import demo from './demo-data.json';

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
      name: demo.department.name,
      code: demo.department.code,
    },
  });
  console.log(`✓ Created Department: ${department.name}`);

  // 2. Create Admin User
  const adminUser = await prisma.user.create({
    data: {
      email: demo.admin.email,
      name: demo.admin.name,
      passwordHash,
      role: Role.ADMIN,
    },
  });
  console.log(`✓ Created Admin: ${adminUser.email}`);

  // 3. Create Lecturer
  const lecturerUser = await prisma.user.create({
    data: {
      email: demo.lecturer.email,
      name: demo.lecturer.name,
      passwordHash,
      role: Role.LECTURER,
    },
  });

  const lecturer = await prisma.lecturer.create({
    data: {
      userId: lecturerUser.id,
      employeeNumber: demo.lecturer.employeeNumber,
      departmentId: department.id,
      title: demo.lecturer.title,
    },
  });
  console.log(`✓ Created Lecturer: ${lecturerUser.name} (${lecturer.employeeNumber})`);

  // 4. Create Modules
  const modulesData = demo.modules;

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
  const studentsList = demo.students;

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
        studentNumber: s.studentNumber,
        departmentId: department.id,
        programme: demo.programme,
        academicYear: demo.academicYear,
        batch: demo.batch,
      },
    });
    createdStudents.push(student);

    // Enroll in the selected Computer Science curriculum modules
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
  console.log(`Lecturer: ${demo.lecturer.email}`);
  console.log(`Students: ${demo.students[0].studentNumber} through ${demo.students[demo.students.length - 1].studentNumber}`);
  console.log(`Admin: ${demo.admin.email}`);
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
