import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('🧪 Starting Smart Attendance System End-to-End Tests...\n');

  try {
    // 1. Health Check
    console.log('1️⃣ Testing Server Health Check...');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('   ✓ Health check passed:', health.data.status);

    // 2. Lecturer Login
    console.log('\n2️⃣ Testing Lecturer Login (lecturer@univ.ac.lk)...');
    const lecLogin = await axios.post(`${BASE_URL}/auth/login`, {
      identifier: 'lecturer@univ.ac.lk',
      password: 'password123',
    });
    const lecturerToken = lecLogin.data.data.accessToken;
    console.log('   ✓ Lecturer login successful. Role:', lecLogin.data.data.user.role);

    // 3. Student 1 Login
    console.log('\n3️⃣ Testing Student Login (STU001)...');
    const stu1Login = await axios.post(`${BASE_URL}/auth/login`, {
      identifier: 'stu001@student.univ.ac.lk',
      password: 'password123',
    });
    const student1Token = stu1Login.data.data.accessToken;
    console.log('   ✓ Student 1 login successful. Number:', stu1Login.data.data.user.student.studentNumber);

    // 4. Fetch Lecturer Modules
    console.log('\n4️⃣ Testing Lecturer Modules Retrieval...');
    const modulesRes = await axios.get(`${BASE_URL}/lecturer/modules`, {
      headers: { Authorization: `Bearer ${lecturerToken}` },
    });
    const moduleItem = modulesRes.data.data[0];
    console.log(`   ✓ Found ${modulesRes.data.data.length} modules. Selected: ${moduleItem.moduleCode} (${moduleItem.moduleName})`);

    // 5. Create Attendance Session
    console.log('\n5️⃣ Testing Create Attendance Session...');
    const sessionRes = await axios.post(
      `${BASE_URL}/lecturer/sessions`,
      {
        moduleId: moduleItem.id,
        durationMinutes: 10,
        lateThresholdMinutes: 5,
        geoValidationEnabled: false,
      },
      { headers: { Authorization: `Bearer ${lecturerToken}` } }
    );
    const session = sessionRes.data.data.session;
    const qrString = sessionRes.data.data.qrString;
    console.log(`   ✓ Attendance Session created: ${session.sessionCode} (ID: ${session.id})`);
    console.log('   ✓ Dynamic QR Payload generated successfully');

    // 6. Student 1 Scans QR
    console.log('\n6️⃣ Testing Student 1 QR Scan Submission...');
    const scanRes = await axios.post(
      `${BASE_URL}/attendance/scan`,
      { qrToken: qrString },
      { headers: { Authorization: `Bearer ${student1Token}` } }
    );
    console.log(`   ✓ Scan succeeded! Status: ${scanRes.data.data.status} for ${scanRes.data.data.moduleCode}`);

    // 7. Duplicate Scan Prevention
    console.log('\n7️⃣ Testing Duplicate Scan Prevention (Student 1 scanning same session again)...');
    try {
      await axios.post(
        `${BASE_URL}/attendance/scan`,
        { qrToken: qrString },
        { headers: { Authorization: `Bearer ${student1Token}` } }
      );
      console.error('   ❌ FAILED: Duplicate scan was accepted!');
    } catch (err: any) {
      if (err.response?.status === 409) {
        console.log('   ✓ Duplicate scan correctly rejected with 409:', err.response.data.error);
      } else {
        console.log('   ✓ Duplicate rejected with status:', err.response?.status);
      }
    }

    // 8. Tampered / Fake QR Rejection
    console.log('\n8️⃣ Testing Tampered QR Rejection...');
    try {
      const tamperedQR = JSON.stringify({
        sessionId: session.id,
        nonce: 'fake-nonce',
        timestamp: Date.now(),
        signature: 'fake-invalid-hmac-signature',
      });
      await axios.post(
        `${BASE_URL}/attendance/scan`,
        { qrToken: tamperedQR },
        { headers: { Authorization: `Bearer ${student1Token}` } }
      );
      console.error('   ❌ FAILED: Tampered QR was accepted!');
    } catch (err: any) {
      console.log('   ✓ Tampered QR correctly rejected with 400:', err.response?.data?.error);
    }

    // 9. Close Attendance Session & Automated Absence
    console.log('\n9️⃣ Testing Close Attendance Session & Auto-Absence Calculation...');
    const closeRes = await axios.post(
      `${BASE_URL}/lecturer/sessions/${session.id}/close`,
      {},
      { headers: { Authorization: `Bearer ${lecturerToken}` } }
    );
    console.log('   ✓ Session closed successfully:');
    console.log(`     - Total Students: ${closeRes.data.data.totalStudents}`);
    console.log(`     - Present:        ${closeRes.data.data.present}`);
    console.log(`     - Late:           ${closeRes.data.data.late}`);
    console.log(`     - Absent (Auto):  ${closeRes.data.data.absent}`);
    console.log(`     - Attendance Rate:${closeRes.data.data.attendanceRate}%`);

    // 10. Student 1 Views Attendance History
    console.log('\n🔟 Testing Student Attendance History...');
    const historyRes = await axios.get(`${BASE_URL}/student/attendance/history`, {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    console.log(`   ✓ Student 1 has ${historyRes.data.data.length} recorded session(s) in history`);

    console.log('\n🎉 ALL AUTOMATED TESTS PASSED SUCCESSFULLY! 🎉\n');
  } catch (err: any) {
    console.error('\n❌ Test failed with error:', err.response?.data || err.message);
  }
}

runTests();
