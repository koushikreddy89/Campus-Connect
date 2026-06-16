const mongoose = require('mongoose');
const { User, Alumni, CollegeAlumniRecord, OTP } = require('./models');

// Extract routes
const routes = require('./routes');

// Helper to find route handler
function getHandler(path, method) {
  const routeStack = routes.stack.find(s => 
    s.route && 
    s.route.path === path && 
    s.route.methods[method]
  );
  if (!routeStack) throw new Error(`Handler not found for ${method.toUpperCase()} ${path}`);
  return routeStack.route.stack[routeStack.route.stack.length - 1].handle;
}

async function runTests() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect('mongodb://127.0.0.1:27017/campus-connect');
  console.log('✅ Connected.');

  // Clean up
  await User.deleteMany({ email: 'test_constraint@sru.edu.in' });
  await User.deleteMany({ personalEmail: 'test_constraint@gmail.com' });
  await Alumni.deleteMany({ email: 'test_constraint@gmail.com' });
  await CollegeAlumniRecord.deleteMany({ personalEmail: 'test_constraint@gmail.com' });
  await OTP.deleteMany({ email: 'test_constraint@gmail.com' });
  await OTP.deleteMany({ email: 'test_constraint@sru.edu.in' });

  // 1. Create a Student Alice
  console.log('\n--- Creating Student: Alice ---');
  const alice = new User({
    userId: 'student-alice',
    email: 'test_constraint@sru.edu.in',
    collegeEmail: 'test_constraint@sru.edu.in',
    personalEmail: 'test_constraint@gmail.com',
    name: 'Alice Smith',
    role: 'student'
  });
  await alice.save();
  console.log('✅ Student Alice saved.');
  const foundAlice = await User.findOne({ userId: 'student-alice' });
  console.log('Alice document in database:', JSON.stringify(foundAlice));

  // 2. Try to update another student's profile (Bob) using Alice's email
  console.log('\n--- Test 1: Register/Update student Bob with Alice\'s email ---');
  const postStudentProfile = getHandler('/student/profile', 'post');

  let resStatus = 200;
  let resJson = {};
  
  const mockReqBob = {
    body: {
      userId: 'student-bob',
      email: 'test_constraint@sru.edu.in',
      name: 'Bob Jones'
    }
  };
  const mockResBob = {
    status(code) {
      resStatus = code;
      return this;
    },
    json(obj) {
      resJson = obj;
      return this;
    }
  };

  await postStudentProfile(mockReqBob, mockResBob);
  
  console.log('Bob response status:', resStatus);
  console.log('Bob response body:', resJson);
  if (resStatus === 400 && resJson.error && resJson.error.includes('already exists for Alice Smith')) {
    console.log('✅ Test 1 Passed: Bob was blocked and error message indicates Alice Smith!');
  } else {
    console.error('❌ Test 1 Failed!');
    process.exit(1);
  }

  // 3. Try to update another student's profile (Alice) - should be allowed since it's the same userId
  console.log('\n--- Test 2: Update Alice\'s profile (allowed same user) ---');
  resStatus = 200;
  resJson = {};
  
  const mockReqAliceUpdate = {
    body: {
      userId: 'student-alice',
      email: 'test_constraint@sru.edu.in',
      name: 'alice smith', // same name normalized, should be allowed
      personalEmail: 'test_constraint@gmail.com'
    }
  };
  const mockResAliceUpdate = {
    status(code) {
      resStatus = code;
      return this;
    },
    json(obj) {
      resJson = obj;
      return this;
    }
  };

  await postStudentProfile(mockReqAliceUpdate, mockResAliceUpdate);
  console.log('Alice update response status:', resStatus);
  if (resStatus === 200) {
    console.log('✅ Test 2 Passed: Alice was allowed to update her own profile!');
  } else {
    console.error('❌ Test 2 Failed:', resJson);
    process.exit(1);
  }

  // 4. Try to verify alumni with Alice's personalEmail but different name
  console.log('\n--- Test 3: Verify Alumni Charlie with Alice\'s personalEmail ---');
  // First seed college record
  const collegeRecord = new CollegeAlumniRecord({
    personalEmail: 'test_constraint@gmail.com',
    rollNumber: 'ROLL123',
    batch: '2024',
    name: 'Charlie Brown',
    department: 'Computer Science'
  });
  await collegeRecord.save();

  const verifyAlumni = getHandler('/auth/verify-alumni', 'post');
  
  resStatus = 200;
  resJson = {};

  const mockReqVerifyAlumni = {
    body: {
      personalEmail: 'test_constraint@gmail.com',
      rollNumber: 'ROLL123',
      batch: '2024'
    }
  };
  const mockResVerifyAlumni = {
    status(code) {
      resStatus = code;
      return this;
    },
    json(obj) {
      resJson = obj;
      return this;
    }
  };

  await verifyAlumni(mockReqVerifyAlumni, mockResVerifyAlumni);

  console.log('Verify alumni response status:', resStatus);
  console.log('Verify alumni response body:', resJson);
  if (resStatus === 400 && resJson.error && resJson.error.toLowerCase().includes('already exists for alice smith')) {
    console.log('✅ Test 3 Passed: Alumni verification blocked due to conflict with Alice Smith!');
  } else {
    console.error('❌ Test 3 Failed!');
    process.exit(1);
  }

  // Clean up
  await User.deleteMany({ email: 'test_constraint@sru.edu.in' });
  await User.deleteMany({ personalEmail: 'test_constraint@gmail.com' });
  await Alumni.deleteMany({ email: 'test_constraint@gmail.com' });
  await CollegeAlumniRecord.deleteMany({ personalEmail: 'test_constraint@gmail.com' });
  await OTP.deleteMany({ email: 'test_constraint@gmail.com' });
  await OTP.deleteMany({ email: 'test_constraint@sru.edu.in' });

  console.log('\n🎉 ALL EMAIL-NAME CONSTRAINT TESTS PASSED CLEANLY!');
  await mongoose.disconnect();
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
