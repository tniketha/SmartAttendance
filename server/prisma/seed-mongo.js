/**
 * Direct MongoDB seed script using the native MongoDB driver.
 * This bypasses Prisma's transaction requirement so it works
 * with a standalone MongoDB instance (no replica set needed).
 */
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');

require('dotenv').config();
if (process.env.NODE_ENV === 'production' || process.env.ALLOW_DEMO_RESET !== 'true') throw new Error('Demo reset disabled. Use a disposable development database and set ALLOW_DEMO_RESET=true.');
const MONGO_URL = process.env.DATABASE_URL || 'mongodb://localhost:27017/smart_attendance';
const DB_NAME = new URL(MONGO_URL).pathname.slice(1);
if (!DB_NAME) throw new Error('DATABASE_URL must name a database');

async function main() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  const db = client.db(DB_NAME);

  console.log('🌱 Connected to MongoDB. Starting seed...\n');

  // ─── Drop collections in safe order ─────────────────────────────────
  const collections = [
    'attendance_review_requests',
    'attendance_audit_logs',
    'attendance_records',
    'attendance_sessions',
    'enrollments',
    'modules',
    'students',
    'lecturers',
    'users',
    'departments',
  ];
  for (const col of collections) {
    await db.collection(col).deleteMany({});
  }
  console.log('✓ Cleared existing data');

  const passwordHash = await bcrypt.hash('password123', 10);
  const now = new Date();

  // ─── 1. Department ───────────────────────────────────────────────────
  const deptId = new ObjectId();
  await db.collection('departments').insertOne({
    _id: deptId,
    name: 'Department of Physical Science',
    code: 'DPS',
  });
  console.log('✓ Created Department: Department of Physical Science');

  // ─── 2. Admin User ───────────────────────────────────────────────────
  const adminUserId = new ObjectId();
  await db.collection('users').insertOne({
    _id: adminUserId,
    email: 'admin@univ.ac.lk',
    password_hash: passwordHash,
    name: 'System Administrator',
    role: 'ADMIN',
    is_active: true,
    created_at: now,
    updated_at: now,
  });
  console.log('✓ Created Admin: admin@univ.ac.lk');

  // ─── 3. Lecturer User + Profile ──────────────────────────────────────
  const lecturerUserId = new ObjectId();
  await db.collection('users').insertOne({
    _id: lecturerUserId,
    email: 'lecturer@univ.ac.lk',
    password_hash: passwordHash,
    name: 'Dr. Robert Smith',
    role: 'LECTURER',
    is_active: true,
    created_at: now,
    updated_at: now,
  });

  const lecturerId = new ObjectId();
  await db.collection('lecturers').insertOne({
    _id: lecturerId,
    user_id: lecturerUserId,
    employee_number: 'EMP001',
    department_id: deptId,
    title: 'Senior Lecturer',
  });
  console.log('✓ Created Lecturer: Dr. Robert Smith (EMP001)');

  // ─── 4. Modules ──────────────────────────────────────────────────────
  const modulesData = [
    { moduleCode: 'CSC3213', moduleName: 'Computer Architecture' },
    { moduleCode: 'CSH3153', moduleName: 'Human Computer Interaction' },
    { moduleCode: 'CSC3112', moduleName: 'Computer Graphics' },
  ];

  const moduleIds = [];
  for (const m of modulesData) {
    const moduleId = new ObjectId();
    moduleIds.push({ id: moduleId, code: m.moduleCode, name: m.moduleName });
    await db.collection('modules').insertOne({
      _id: moduleId,
      module_code: m.moduleCode,
      module_name: m.moduleName,
      department_id: deptId,
      lecturer_id: lecturerId,
      academic_year: 'Year 3',
      semester: 1,
    });
    console.log(`✓ Created Module: ${m.moduleCode} - ${m.moduleName}`);
  }

  // ─── 5. Students ─────────────────────────────────────────────────────
  const studentsList = [
    { num: 'STU001', name: 'Nimal Perera',          email: 'stu001@student.univ.ac.lk' },
    { num: 'STU002', name: 'Kamal Silva',            email: 'stu002@student.univ.ac.lk' },
    { num: 'STU003', name: 'Amal Fernando',          email: 'stu003@student.univ.ac.lk' },
    { num: 'STU004', name: 'Sunil Jayawardena',      email: 'stu004@student.univ.ac.lk' },
    { num: 'STU005', name: 'Kasun Bandara',          email: 'stu005@student.univ.ac.lk' },
    { num: 'STU006', name: 'Dilani Wickramasinghe',  email: 'stu006@student.univ.ac.lk' },
    { num: 'STU007', name: 'Ruwan Dissanayake',      email: 'stu007@student.univ.ac.lk' },
    { num: 'STU008', name: 'Anura Gunasekara',       email: 'stu008@student.univ.ac.lk' },
    { num: 'STU009', name: 'Chathuri Senanayake',    email: 'stu009@student.univ.ac.lk' },
    { num: 'STU010', name: 'Mahesh Thilakarathne',   email: 'stu010@student.univ.ac.lk' },
  ];

  let studentCount = 0;
  for (const s of studentsList) {
    const stuUserId = new ObjectId();
    await db.collection('users').insertOne({
      _id: stuUserId,
      email: s.email,
      password_hash: passwordHash,
      name: s.name,
      role: 'STUDENT',
      is_active: true,
      created_at: now,
      updated_at: now,
    });

    const stuId = new ObjectId();
    await db.collection('students').insertOne({
      _id: stuId,
      user_id: stuUserId,
      student_number: s.num,
      department_id: deptId,
      programme: 'BSc Honours in Computer Science',
      academic_year: 'Year 3',
      batch: '2023/2024',
    });

    // Enroll in all 3 modules
    for (const mod of moduleIds) {
      await db.collection('enrollments').insertOne({
        _id: new ObjectId(),
        student_id: stuId,
        module_id: mod.id,
        enrolled_at: now,
      });
    }
    studentCount++;
  }
  console.log(`✓ Created ${studentCount} Students, each enrolled in ${moduleIds.length} Modules`);

  await client.close();

  console.log('\n🎉 Database seeded successfully!');
  console.log('─────────────────────────────────────────────');
  console.log('Default password for ALL accounts: password123');
  console.log('─────────────────────────────────────────────');
  console.log('👨‍💼 Lecturer :  lecturer@univ.ac.lk');
  console.log('👨‍🎓 Students :  stu001@student.univ.ac.lk  →  stu010@student.univ.ac.lk');
  console.log('🛡️  Admin    :  admin@univ.ac.lk');
  console.log('─────────────────────────────────────────────');
}

main().catch((e) => {
  console.error('❌ Seed error:', e.message);
  process.exit(1);
});
