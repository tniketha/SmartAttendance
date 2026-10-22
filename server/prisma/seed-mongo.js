/**
 * Direct MongoDB seed script using the native MongoDB driver.
 * This bypasses Prisma's transaction requirement so it works
 * with a standalone MongoDB instance (no replica set needed).
 */
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const demo = require('./demo-data.json');

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
    name: demo.department.name,
    code: demo.department.code,
  });
  console.log(`✓ Created Department: ${demo.department.name}`);

  // ─── 2. Admin User ───────────────────────────────────────────────────
  const adminUserId = new ObjectId();
  await db.collection('users').insertOne({
    _id: adminUserId,
    email: demo.admin.email,
    password_hash: passwordHash,
    name: demo.admin.name,
    role: 'ADMIN',
    is_active: true,
    sessionVersion: 0,
    created_at: now,
    updated_at: now,
  });
  console.log(`✓ Created Admin: ${demo.admin.name}`);

  // ─── 3. Lecturer User + Profile ──────────────────────────────────────
  const lecturerUserId = new ObjectId();
  await db.collection('users').insertOne({
    _id: lecturerUserId,
    email: demo.lecturer.email,
    password_hash: passwordHash,
    name: demo.lecturer.name,
    role: 'LECTURER',
    is_active: true,
    sessionVersion: 0,
    created_at: now,
    updated_at: now,
  });

  const lecturerId = new ObjectId();
  await db.collection('lecturers').insertOne({
    _id: lecturerId,
    user_id: lecturerUserId,
    employee_number: demo.lecturer.employeeNumber,
    department_id: deptId,
    title: demo.lecturer.title,
  });
  console.log(`✓ Created Lecturer: ${demo.lecturer.name}`);

  // ─── 4. Modules ──────────────────────────────────────────────────────
  const modulesData = demo.modules;

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
      academic_year: m.academicYear,
      semester: m.semester,
    });
    console.log(`✓ Created Module: ${m.moduleCode} - ${m.moduleName}`);
  }

  // ─── 5. Students ─────────────────────────────────────────────────────
  const studentsList = demo.students;

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
      sessionVersion: 0,
      created_at: now,
      updated_at: now,
    });

    const stuId = new ObjectId();
    await db.collection('students').insertOne({
      _id: stuId,
      user_id: stuUserId,
      student_number: s.studentNumber,
      department_id: deptId,
      programme: demo.programme,
      academic_year: demo.academicYear,
      batch: demo.batch,
    });

    // Enroll in the selected Computer Science curriculum modules
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
  console.log(`Lecturer: ${demo.lecturer.email}`);
  console.log(`Students: ${demo.students[0].studentNumber} through ${demo.students.at(-1).studentNumber}`);
  console.log(`Admin: ${demo.admin.email}`);
  console.log('─────────────────────────────────────────────');
}

main().catch((e) => {
  console.error('❌ Seed error:', e.message);
  process.exit(1);
});
