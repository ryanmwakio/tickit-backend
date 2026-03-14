import { DataSource } from 'typeorm';
import { User, UserRole, UserStatus } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { hashPassword } from '../../common/utils/password.util';
import { v4 as uuidv4 } from 'uuid';

export async function seedUsers(dataSource: DataSource): Promise<void> {
  const userRepository = dataSource.getRepository(User);
  const roleRepository = dataSource.getRepository(Role);

  // Get role IDs
  const roles = await roleRepository.find();
  const roleMap: Record<string, Role> = {};
  roles.forEach(role => {
    roleMap[role.name] = role;
  });

  // Default password for all seeded users: "Password123!"
  const defaultPassword = await hashPassword('Password123!');

  interface UserSeedData {
    id: string;
    email: string;
    phoneNumber: string;
    password_hash: string;
    firstName: string;
    lastName: string;
    status: UserStatus;
    activeRole: UserRole;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    roleName: string;
  }

  const users: UserSeedData[] = [
    // Admin users
    {
      id: uuidv4(),
      email: 'admin@tickit.com',
      phoneNumber: '+254700000001',
      password_hash: defaultPassword,
      firstName: 'Admin',
      lastName: 'User',
      status: UserStatus.ACTIVE,
      activeRole: UserRole.ADMIN,
      isEmailVerified: true,
      isPhoneVerified: true,
      roleName: 'ADMIN',
    },
    {
      id: uuidv4(),
      email: 'admin@tixhub.com',
      phoneNumber: '+254700000003',
      password_hash: defaultPassword,
      firstName: 'Admin',
      lastName: 'Tixhub',
      status: UserStatus.ACTIVE,
      activeRole: UserRole.ADMIN,
      isEmailVerified: true,
      isPhoneVerified: true,
      roleName: 'ADMIN',
    },
    {
      id: uuidv4(),
      email: 'superadmin@tickit.com',
      phoneNumber: '+254700000002',
      password_hash: defaultPassword,
      firstName: 'Super',
      lastName: 'Admin',
      status: UserStatus.ACTIVE,
      activeRole: UserRole.ADMIN,
      isEmailVerified: true,
      isPhoneVerified: true,
      roleName: 'ADMIN',
    },

    // Organiser users
    {
      id: uuidv4(),
      email: 'organiser1@tickit.com',
      phoneNumber: '+254700000010',
      password_hash: defaultPassword,
      firstName: 'John',
      lastName: 'Organiser',
      status: UserStatus.ACTIVE,
      activeRole: UserRole.ORGANISER,
      isEmailVerified: true,
      isPhoneVerified: true,
      roleName: 'ORGANISER',
    },
    {
      id: uuidv4(),
      email: 'organiser2@tickit.com',
      phoneNumber: '+254700000011',
      password_hash: defaultPassword,
      firstName: 'Jane',
      lastName: 'Events',
      status: UserStatus.ACTIVE,
      activeRole: UserRole.ORGANISER,
      isEmailVerified: true,
      isPhoneVerified: true,
      roleName: 'ORGANISER',
    },
    {
      id: uuidv4(),
      email: 'promoter@tickit.com',
      phoneNumber: '+254700000020',
      password_hash: defaultPassword,
      firstName: 'Mike',
      lastName: 'Promoter',
      status: UserStatus.ACTIVE,
      activeRole: UserRole.PROMOTER,
      isEmailVerified: true,
      isPhoneVerified: true,
      roleName: 'PROMOTER',
    },

    // Staff users
    {
      id: uuidv4(),
      email: 'staff1@tickit.com',
      phoneNumber: '+254700000030',
      password_hash: defaultPassword,
      firstName: 'Sarah',
      lastName: 'Staff',
      status: UserStatus.ACTIVE,
      activeRole: UserRole.STAFF,
      isEmailVerified: true,
      isPhoneVerified: true,
      roleName: 'STAFF',
    },
    {
      id: uuidv4(),
      email: 'staff2@tickit.com',
      phoneNumber: '+254700000031',
      password_hash: defaultPassword,
      firstName: 'David',
      lastName: 'Helper',
      status: UserStatus.ACTIVE,
      activeRole: UserRole.STAFF,
      isEmailVerified: true,
      isPhoneVerified: true,
      roleName: 'STAFF',
    },

    // Regular attendee users
    {
      id: uuidv4(),
      email: 'user1@tickit.com',
      phoneNumber: '+254700000100',
      password_hash: defaultPassword,
      firstName: 'Alice',
      lastName: 'Attendee',
      status: UserStatus.ACTIVE,
      activeRole: UserRole.ATTENDEE,
      isEmailVerified: true,
      isPhoneVerified: true,
      roleName: 'ATTENDEE',
    },
    {
      id: uuidv4(),
      email: 'user2@tickit.com',
      phoneNumber: '+254700000101',
      password_hash: defaultPassword,
      firstName: 'Bob',
      lastName: 'Buyer',
      status: UserStatus.ACTIVE,
      activeRole: UserRole.ATTENDEE,
      isEmailVerified: true,
      isPhoneVerified: true,
      roleName: 'ATTENDEE',
    },
    {
      id: uuidv4(),
      email: 'user3@tickit.com',
      phoneNumber: '+254700000102',
      password_hash: defaultPassword,
      firstName: 'Charlie',
      lastName: 'Customer',
      status: UserStatus.ACTIVE,
      activeRole: UserRole.ATTENDEE,
      isEmailVerified: true,
      isPhoneVerified: true,
      roleName: 'ATTENDEE',
    },
    {
      id: uuidv4(),
      email: 'user4@tickit.com',
      phoneNumber: '+254700000103',
      password_hash: defaultPassword,
      firstName: 'Diana',
      lastName: 'Dancer',
      status: UserStatus.ACTIVE,
      activeRole: UserRole.ATTENDEE,
      isEmailVerified: true,
      isPhoneVerified: true,
      roleName: 'ATTENDEE',
    },
    {
      id: uuidv4(),
      email: 'user5@tickit.com',
      phoneNumber: '+254700000104',
      password_hash: defaultPassword,
      firstName: 'Eve',
      lastName: 'Eventgoer',
      status: UserStatus.ACTIVE,
      activeRole: UserRole.ATTENDEE,
      isEmailVerified: true,
      isPhoneVerified: true,
      roleName: 'ATTENDEE',
    },
  ];

  console.log('Seeding users...');

  for (const userData of users) {
    // Check if user already exists
    const existingUser = await userRepository.findOne({
      where: [
        { email: userData.email },
        { phoneNumber: userData.phoneNumber },
      ],
      relations: ['rolesList'],
    });

    if (!existingUser) {
      const { roleName, ...userDataWithoutRole } = userData;
      const user = userRepository.create({
        id: userDataWithoutRole.id,
        email: userDataWithoutRole.email,
        phoneNumber: userDataWithoutRole.phoneNumber,
        passwordHash: userDataWithoutRole.password_hash,
        firstName: userDataWithoutRole.firstName,
        lastName: userDataWithoutRole.lastName,
        status: userDataWithoutRole.status,
        activeRole: userDataWithoutRole.activeRole,
        isEmailVerified: userDataWithoutRole.isEmailVerified,
        isPhoneVerified: userDataWithoutRole.isPhoneVerified,
      });
      const savedUser = await userRepository.save(user);
      
      // Assign role if roleName exists
      if (roleName && roleMap[roleName]) {
        savedUser.rolesList = [roleMap[roleName]];
        await userRepository.save(savedUser);
      }
      
      console.log(`✅ Created user: ${userData.email} (${userData.activeRole})`);
    } else {
      console.log(`⏭️  User already exists: ${userData.email}`);
    }
  }

  console.log(`✅ Seeded ${users.length} users`);
  console.log('\n📝 Default password for all users: Password123!');
  console.log('\n👤 Test Users:');
  console.log('  Admin: admin@tickit.com or admin@tixhub.com / Password123!');
  console.log('  Organiser: organiser1@tickit.com / Password123!');
  console.log('  User: user1@tickit.com / Password123!');
}
