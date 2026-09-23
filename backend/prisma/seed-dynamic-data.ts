import { 
  PrismaClient, 
  ClientStatus, 
  ContractStatus, 
  BillingCycle, 
  BillingModel, 
  EmployeeStatus, 
  Gender, 
  MaritalStatus, 
  VehicleStatus, 
  VehicleType, 
  FuelType, 
  DeploymentStatus, 
  AttendanceStatus, 
  AttendanceMethod, 
  LeaveStatus, 
  ReplacementType, 
  ReplacementStatus, 
  PayrollBatchStatus, 
  SalaryPaymentStatus, 
  InvoiceStatus, 
  PaymentMode, 
  DocumentEntityType, 
  VerificationStatus, 
  ExpiryAlertStatus, 
  RecruitmentStatus, 
  CandidateOfferStatus, 
  NotificationCategory, 
  NotificationPriority 
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Seeding comprehensive dynamic operations data...');

  // 1. Get Agency & Branches
  const agency = await prisma.agency.findFirst({ where: { deletedAt: null } });
  if (!agency) throw new Error('Agency not found! Run npm run seed first.');

  const branchTRC = await prisma.agencyBranch.findFirst({ where: { agencyId: agency.id, branchCode: 'TRC' } });
  const branchCHN = await prisma.agencyBranch.findFirst({ where: { agencyId: agency.id, branchCode: 'CHN' } });
  if (!branchTRC || !branchCHN) throw new Error('Branches not found!');

  const adminUser = await prisma.user.findFirst({ where: { agencyId: agency.id, email: 'admin@apexmanpower.in' } });
  if (!adminUser) throw new Error('Admin user not found!');

  const designations = await prisma.designation.findMany({ where: { agencyId: agency.id } });
  const desigDriver = designations.find(d => d.code === 'DRV-HV') || designations[0];
  const desigSecurity = designations.find(d => d.code === 'SEC-GD') || designations[1];
  const desigSupervisor = designations.find(d => d.code === 'SEC-SO') || designations[2] || designations[0];
  const desigHousekeeping = designations.find(d => d.code === 'HKP-ST') || designations[3] || designations[0];

  const leaveTypes = await prisma.leaveType.findMany({ where: { agencyId: agency.id } });
  const ltEarned = leaveTypes.find(l => l.code === 'EL') || leaveTypes[0];
  const ltCasual = leaveTypes.find(l => l.code === 'CL') || leaveTypes[1] || leaveTypes[0];
  const ltSick = leaveTypes.find(l => l.code === 'SL') || leaveTypes[2] || leaveTypes[0];

  const docTypes = await prisma.documentType.findMany({ where: { agencyId: agency.id } });
  const docRC = docTypes.find(d => d.code === 'VEHICLE_RC');
  const docDL = docTypes.find(d => d.code === 'DRIVING_LICENSE');
  const docAadhaar = docTypes.find(d => d.code === 'AADHAAR');

  // ==========================================
  // 2. SEED CLIENT ORGANIZATIONS & SITES
  // ==========================================
  console.log('  -> Seeding Client Organizations, Sites & Rate Cards...');

  const client1 = await prisma.client.upsert({
    where: { agencyId_clientCode: { agencyId: agency.id, clientCode: 'CLI-TVS-001' } },
    update: {},
    create: {
      agencyId: agency.id,
      branchId: branchTRC.id,
      clientCode: 'CLI-TVS-001',
      companyName: 'TVS Mobility & Logistics Ltd',
      legalName: 'TVS Mobility and Supply Chain Solutions Private Limited',
      pan: 'AABCT1234F',
      gstin: '33AABCT1234F1Z9',
      stateCode: '33',
      billingAddress: 'TVS Industrial Complex, NH 45, Trichy, Tamil Nadu 620012',
      contactPersonName: 'S. Ramanathan',
      contactEmail: 'ramanathan.s@tvsmobility.in',
      contactPhone: '+91 98424 55110',
      paymentTermsDays: 30,
      status: ClientStatus.ACTIVE,
    }
  });

  const client2 = await prisma.client.upsert({
    where: { agencyId_clientCode: { agencyId: agency.id, clientCode: 'CLI-APL-002' } },
    update: {},
    create: {
      agencyId: agency.id,
      branchId: branchCHN.id,
      clientCode: 'CLI-APL-002',
      companyName: 'Apollo Specialty Hospitals',
      legalName: 'Apollo Hospitals Enterprise Limited',
      pan: 'AAACA8899D',
      gstin: '33AAACA8899D1ZW',
      stateCode: '33',
      billingAddress: '21 Greams Lane, Thousand Lights, Chennai, Tamil Nadu 600006',
      contactPersonName: 'K. Meenakshi',
      contactEmail: 'meenakshi_k@apollohospitals.com',
      contactPhone: '+91 98401 77334',
      paymentTermsDays: 45,
      status: ClientStatus.ACTIVE,
    }
  });

  const client3 = await prisma.client.upsert({
    where: { agencyId_clientCode: { agencyId: agency.id, clientCode: 'CLI-LNT-003' } },
    update: {},
    create: {
      agencyId: agency.id,
      branchId: branchCHN.id,
      clientCode: 'CLI-LNT-003',
      companyName: 'L&T Metro Infrastructure',
      legalName: 'Larsen & Toubro Limited - Construction Division',
      pan: 'AAACL5544B',
      gstin: '33AAACL5544B1ZR',
      stateCode: '33',
      billingAddress: 'L&T Campus, Mount Poonamallee Road, Manapakkam, Chennai 600089',
      contactPersonName: 'G. Sundaram',
      contactEmail: 'sundaram.g@lntecc.com',
      contactPhone: '+91 94440 99881',
      paymentTermsDays: 30,
      status: ClientStatus.ACTIVE,
    }
  });

  // Client Sites
  const siteTVS = await prisma.clientSite.upsert({
    where: { clientId_siteCode: { clientId: client1.id, siteCode: 'SITE-TVS-WH1' } },
    update: {},
    create: {
      clientId: client1.id,
      siteCode: 'SITE-TVS-WH1',
      siteName: 'TVS Trichy Regional Logistics Depot',
      address: 'Plot 45-B, SIDCO Industrial Estate, Thuvakudi, Trichy 620015',
      city: 'Tiruchirappalli',
      stateCode: '33',
      pincode: '620015',
      siteSupervisorName: 'M. Anand',
      siteSupervisorPhone: '+91 97911 34567',
      isActive: true,
    }
  });

  const siteApollo = await prisma.clientSite.upsert({
    where: { clientId_siteCode: { clientId: client2.id, siteCode: 'SITE-APL-MN' } },
    update: {},
    create: {
      clientId: client2.id,
      siteCode: 'SITE-APL-MN',
      siteName: 'Apollo Main Greams Road Medical Block',
      address: '21 Greams Lane, Off Greams Road, Thousand Lights, Chennai 600006',
      city: 'Chennai',
      stateCode: '33',
      pincode: '600006',
      siteSupervisorName: 'V. Jayaraj',
      siteSupervisorPhone: '+91 98840 55667',
      isActive: true,
    }
  });

  const siteLNT = await prisma.clientSite.upsert({
    where: { clientId_siteCode: { clientId: client3.id, siteCode: 'SITE-LNT-MET' } },
    update: {},
    create: {
      clientId: client3.id,
      siteCode: 'SITE-LNT-MET',
      siteName: 'L&T Guindy Metro Hub Construction Site',
      address: 'Guindy Industrial Estate, Metro Phase 2 Yard, Chennai 600032',
      city: 'Chennai',
      stateCode: '33',
      pincode: '600032',
      siteSupervisorName: 'R. Veerappan',
      siteSupervisorPhone: '+91 94451 88992',
      isActive: true,
    }
  });

  // Client Contracts
  const contractTVS = await prisma.clientContract.upsert({
    where: { clientId_contractNumber: { clientId: client1.id, contractNumber: 'CTR-TVS-2026-01' } },
    update: {},
    create: {
      clientId: client1.id,
      contractNumber: 'CTR-TVS-2026-01',
      title: 'TVS Logistics Fleet Drivers and Depot Security 2026',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      noticePeriodDays: 30,
      billingCycle: BillingCycle.MONTHLY,
      status: ContractStatus.ACTIVE,
      autoRenew: true,
      notes: 'Master agreement for 24x7 security personnel and logistics heavy drivers.',
    }
  });

  const contractApollo = await prisma.clientContract.upsert({
    where: { clientId_contractNumber: { clientId: client2.id, contractNumber: 'CTR-APL-2026-01' } },
    update: {},
    create: {
      clientId: client2.id,
      contractNumber: 'CTR-APL-2026-01',
      title: 'Apollo Greams Road Patient Transport & Facility Guarding',
      startDate: new Date('2026-04-01'),
      endDate: new Date('2027-03-31'),
      noticePeriodDays: 60,
      billingCycle: BillingCycle.MONTHLY,
      status: ContractStatus.ACTIVE,
      autoRenew: true,
      notes: 'Emergency ambulance drivers and 3-shift hospital security deployment.',
    }
  });

  // Client Billing Rates
  let rateTvsDriver = await prisma.clientBillingRate.findFirst({
    where: { clientId: client1.id, clientSiteId: siteTVS.id, designationId: desigDriver.id }
  });
  if (!rateTvsDriver) {
    rateTvsDriver = await prisma.clientBillingRate.create({
      data: {
        clientId: client1.id,
        clientSiteId: siteTVS.id,
        designationId: desigDriver.id,
        billingModel: BillingModel.PER_EMPLOYEE_PER_SHIFT,
        rateAmount: 1150.00,
        standardShiftHours: 8.00,
        otHourlyRate: 180.00,
        effectiveFrom: new Date('2026-01-01'),
        isActive: true,
      }
    });
  }

  let rateTvsSecurity = await prisma.clientBillingRate.findFirst({
    where: { clientId: client1.id, clientSiteId: siteTVS.id, designationId: desigSecurity.id }
  });
  if (!rateTvsSecurity) {
    rateTvsSecurity = await prisma.clientBillingRate.create({
      data: {
        clientId: client1.id,
        clientSiteId: siteTVS.id,
        designationId: desigSecurity.id,
        billingModel: BillingModel.PER_EMPLOYEE_PER_SHIFT,
        rateAmount: 850.00,
        standardShiftHours: 8.00,
        otHourlyRate: 140.00,
        effectiveFrom: new Date('2026-01-01'),
        isActive: true,
      }
    });
  }

  let rateApolloSecurity = await prisma.clientBillingRate.findFirst({
    where: { clientId: client2.id, clientSiteId: siteApollo.id, designationId: desigSecurity.id }
  });
  if (!rateApolloSecurity) {
    rateApolloSecurity = await prisma.clientBillingRate.create({
      data: {
        clientId: client2.id,
        clientSiteId: siteApollo.id,
        designationId: desigSecurity.id,
        billingModel: BillingModel.PER_EMPLOYEE_PER_SHIFT,
        rateAmount: 900.00,
        standardShiftHours: 8.00,
        otHourlyRate: 150.00,
        effectiveFrom: new Date('2026-04-01'),
        isActive: true,
      }
    });
  }

  let rateApolloDriver = await prisma.clientBillingRate.findFirst({
    where: { clientId: client2.id, clientSiteId: siteApollo.id, designationId: desigDriver.id }
  });
  if (!rateApolloDriver) {
    rateApolloDriver = await prisma.clientBillingRate.create({
      data: {
        clientId: client2.id,
        clientSiteId: siteApollo.id,
        designationId: desigDriver.id,
        billingModel: BillingModel.PER_EMPLOYEE_PER_SHIFT,
        rateAmount: 1200.00,
        standardShiftHours: 8.00,
        otHourlyRate: 190.00,
        effectiveFrom: new Date('2026-04-01'),
        isActive: true,
      }
    });
  }

  // ==========================================
  // 3. SEED EMPLOYEES & SALARY STRUCTURES
  // ==========================================
  console.log('  -> Seeding Employee Workforce Roster & Salary Packages...');

  const employeeProfiles = [
    {
      code: 'EMP-TRC-0101',
      firstName: 'Ramesh',
      lastName: 'Kumar',
      branch: branchTRC,
      designation: desigDriver,
      gender: Gender.MALE,
      dob: new Date('1990-05-14'),
      doj: new Date('2023-03-01'),
      phone: '+91 98421 11223',
      license: 'TN4520150004521',
      bankName: 'State Bank of India',
      bankBranch: 'Trichy Main',
      basic: 14000.00,
      da: 2000.00,
      hra: 3500.00,
      conveyance: 1500.00,
      special: 1000.00,
    },
    {
      code: 'EMP-TRC-0102',
      firstName: 'Senthil',
      lastName: 'Nathan',
      branch: branchTRC,
      designation: desigDriver,
      gender: Gender.MALE,
      dob: new Date('1988-11-20'),
      doj: new Date('2023-04-15'),
      phone: '+91 97902 44332',
      license: 'TN4520120009876',
      bankName: 'HDFC Bank',
      bankBranch: 'Thillai Nagar, Trichy',
      basic: 14500.00,
      da: 2200.00,
      hra: 3600.00,
      conveyance: 1500.00,
      special: 1200.00,
    },
    {
      code: 'EMP-TRC-0103',
      firstName: 'Rajesh',
      lastName: 'Kannan',
      branch: branchTRC,
      designation: desigSecurity,
      gender: Gender.MALE,
      dob: new Date('1994-08-10'),
      doj: new Date('2024-01-10'),
      phone: '+91 99443 88771',
      license: null,
      bankName: 'Canara Bank',
      bankBranch: 'Cantonment Trichy',
      basic: 11000.00,
      da: 1500.00,
      hra: 2500.00,
      conveyance: 1000.00,
      special: 800.00,
    },
    {
      code: 'EMP-TRC-0104',
      firstName: 'Priya',
      lastName: 'Lakshmi',
      branch: branchTRC,
      designation: desigSecurity,
      gender: Gender.FEMALE,
      dob: new Date('1996-02-18'),
      doj: new Date('2024-02-01'),
      phone: '+91 98425 66778',
      license: null,
      bankName: 'Indian Overseas Bank',
      bankBranch: 'Palakkarai Trichy',
      basic: 11000.00,
      da: 1500.00,
      hra: 2500.00,
      conveyance: 1000.00,
      special: 800.00,
    },
    {
      code: 'EMP-CHN-0201',
      firstName: 'Vigneshwaran',
      lastName: 'Subramanian',
      branch: branchCHN,
      designation: desigDriver,
      gender: Gender.MALE,
      dob: new Date('1991-07-22'),
      doj: new Date('2023-06-10'),
      phone: '+91 98402 12345',
      license: 'TN0920140003322',
      bankName: 'ICICI Bank',
      bankBranch: 'T Nagar Chennai',
      basic: 15000.00,
      da: 2500.00,
      hra: 4000.00,
      conveyance: 1800.00,
      special: 1500.00,
    },
    {
      code: 'EMP-CHN-0202',
      firstName: 'Anand',
      lastName: 'Raj',
      branch: branchCHN,
      designation: desigSupervisor,
      gender: Gender.MALE,
      dob: new Date('1985-03-30'),
      doj: new Date('2022-08-01'),
      phone: '+91 98841 99887',
      license: null,
      bankName: 'Axis Bank',
      bankBranch: 'Guindy Chennai',
      basic: 18000.00,
      da: 3000.00,
      hra: 5000.00,
      conveyance: 2000.00,
      special: 2000.00,
    },
    {
      code: 'EMP-CHN-0203',
      firstName: 'Mohamed',
      lastName: 'Farooq',
      branch: branchCHN,
      designation: desigSecurity,
      gender: Gender.MALE,
      dob: new Date('1993-12-05'),
      doj: new Date('2024-03-15'),
      phone: '+91 99401 55664',
      license: null,
      bankName: 'Kotak Mahindra Bank',
      bankBranch: 'Nungambakkam Chennai',
      basic: 11500.00,
      da: 1600.00,
      hra: 2800.00,
      conveyance: 1200.00,
      special: 900.00,
    },
    {
      code: 'EMP-CHN-0204',
      firstName: 'Karthi',
      lastName: 'Murugan',
      branch: branchCHN,
      designation: desigSecurity,
      gender: Gender.MALE,
      dob: new Date('1995-09-12'),
      doj: new Date('2024-04-01'),
      phone: '+91 98409 33221',
      license: null,
      bankName: 'State Bank of India',
      bankBranch: 'Mount Road Chennai',
      basic: 11500.00,
      da: 1600.00,
      hra: 2800.00,
      conveyance: 1200.00,
      special: 900.00,
    },
    {
      code: 'EMP-CHN-0205',
      firstName: 'Deepa',
      lastName: 'Sundaram',
      branch: branchCHN,
      designation: desigHousekeeping,
      gender: Gender.FEMALE,
      dob: new Date('1992-04-25'),
      doj: new Date('2024-05-10'),
      phone: '+91 97910 88776',
      license: null,
      bankName: 'Indian Bank',
      bankBranch: 'Thousand Lights Chennai',
      basic: 10500.00,
      da: 1400.00,
      hra: 2400.00,
      conveyance: 1000.00,
      special: 700.00,
    },
    {
      code: 'EMP-CHN-0206',
      firstName: 'Balaji',
      lastName: 'Venkatesh',
      branch: branchCHN,
      designation: desigDriver,
      gender: Gender.MALE,
      dob: new Date('1989-10-14'),
      doj: new Date('2023-09-01'),
      phone: '+91 98845 22119',
      license: 'TN0120130005544',
      bankName: 'HDFC Bank',
      bankBranch: 'Anna Nagar Chennai',
      basic: 14800.00,
      da: 2400.00,
      hra: 3800.00,
      conveyance: 1600.00,
      special: 1400.00,
    },
  ];

  const seededEmployees: any[] = [];
  const salaryStructures: any[] = [];

  for (const empData of employeeProfiles) {
    let emp = await prisma.employee.findUnique({
      where: { agencyId_employeeCode: { agencyId: agency.id, employeeCode: empData.code } }
    });

    if (!emp) {
      emp = await prisma.employee.create({
        data: {
          agencyId: agency.id,
          branchId: empData.branch.id,
          employeeCode: empData.code,
          firstName: empData.firstName,
          lastName: empData.lastName,
          gender: empData.gender,
          dateOfBirth: empData.dob,
          dateOfJoining: empData.doj,
          primaryDesignationId: empData.designation.id,
          phone: empData.phone,
          drivingLicenseNumber: empData.license,
          drivingLicenseClass: empData.license ? 'LMV / TRANS / HMV' : null,
          drivingLicenseExpiryDate: empData.license ? new Date('2028-12-31') : null,
          emergencyContactName: `${empData.firstName} Senior`,
          emergencyContactPhone: '+91 94433 22110',
          currentAddress: `Plot ${Math.floor(Math.random() * 80) + 1}, Cross Street, ${empData.branch.city}`,
          permanentAddress: `Native Village, ${empData.branch.city} District, Tamil Nadu`,
          maritalStatus: MaritalStatus.MARRIED,
          bloodGroup: 'O+',
          bankName: empData.bankName,
          bankBranch: empData.bankBranch,
          bankAccountNoEncrypted: 'AES256_ENC_DUMMY_ACCOUNT_STRING',
          bankAccountNoMasked: `XXXXXX${Math.floor(1000 + Math.random() * 9000)}`,
          bankIfsc: 'SBIN0001234',
          panEncrypted: 'AES256_ENC_DUMMY_PAN_STRING',
          panMasked: `ABCDE${Math.floor(1000 + Math.random() * 9000)}F`,
          aadhaarEncrypted: 'AES256_ENC_DUMMY_AADHAAR_STRING',
          aadhaarMasked: `XXXXXXXX${Math.floor(1000 + Math.random() * 9000)}`,
          uanNumber: `10098765${Math.floor(1000 + Math.random() * 9000)}`,
          esicIpNumber: `51998877${Math.floor(1000 + Math.random() * 9000)}`,
          status: EmployeeStatus.ACTIVE,
        }
      });

      // Create initial salary structure
      const salStruct = await prisma.employeeSalaryStructure.create({
        data: {
          employeeId: emp.id,
          basicPay: empData.basic,
          dearnessAllowance: empData.da,
          houseRentAllowance: empData.hra,
          conveyanceAllowance: empData.conveyance,
          specialAllowance: empData.special,
          overtimeRatePerHour: 120.00,
          pfApplicable: true,
          esiApplicable: (empData.basic + empData.da + empData.hra) <= 21000,
          ptApplicable: true,
          lwfApplicable: true,
          effectiveFrom: empData.doj,
          reasonForChange: 'Initial Onboarding Package',
        }
      });
      salaryStructures.push(salStruct);

      // Create Leave Balances
      await prisma.leaveBalance.upsert({
        where: { employeeId_leaveTypeId_year: { employeeId: emp.id, leaveTypeId: ltEarned.id, year: 2026 } },
        update: {},
        create: {
          employeeId: emp.id,
          leaveTypeId: ltEarned.id,
          year: 2026,
          openingBalance: 12.0,
          accruedDays: 8.0,
          consumedDays: 2.0,
          closingBalance: 18.0,
        }
      });

      await prisma.leaveBalance.upsert({
        where: { employeeId_leaveTypeId_year: { employeeId: emp.id, leaveTypeId: ltCasual.id, year: 2026 } },
        update: {},
        create: {
          employeeId: emp.id,
          leaveTypeId: ltCasual.id,
          year: 2026,
          openingBalance: 6.0,
          accruedDays: 4.0,
          consumedDays: 1.0,
          closingBalance: 9.0,
        }
      });

      await prisma.leaveBalance.upsert({
        where: { employeeId_leaveTypeId_year: { employeeId: emp.id, leaveTypeId: ltSick.id, year: 2026 } },
        update: {},
        create: {
          employeeId: emp.id,
          leaveTypeId: ltSick.id,
          year: 2026,
          openingBalance: 6.0,
          accruedDays: 4.0,
          consumedDays: 0.0,
          closingBalance: 10.0,
        }
      });
    } else {
      const existingSal = await prisma.employeeSalaryStructure.findFirst({ where: { employeeId: emp.id } });
      if (existingSal) salaryStructures.push(existingSal);
    }

    seededEmployees.push(emp);
  }

  // ==========================================
  // 4. SEED FLEET & VEHICLES
  // ==========================================
  console.log('  -> Seeding Commercial Fleet & Driver Vehicle Assignments...');

  const vehiclesData = [
    {
      reg: 'TN-45-AQ-1024',
      make: 'Tata Motors',
      model: 'Winger 12-Seater Staff Shuttle',
      type: VehicleType.VAN,
      fuel: FuelType.DIESEL,
      branch: branchTRC,
      client: client1,
      year: 2023,
      odo: 42350,
      status: VehicleStatus.ASSIGNED,
    },
    {
      reg: 'TN-45-EF-3321',
      make: 'Ashok Leyland',
      model: 'Dost Commercial Pickup Van',
      type: VehicleType.TRUCK,
      fuel: FuelType.DIESEL,
      branch: branchTRC,
      client: client1,
      year: 2022,
      odo: 68120,
      status: VehicleStatus.ASSIGNED,
    },
    {
      reg: 'TN-09-CK-8890',
      make: 'Mahindra',
      model: 'Bolero Commercial Security Patrol',
      type: VehicleType.SUV,
      fuel: FuelType.DIESEL,
      branch: branchCHN,
      client: client2,
      year: 2024,
      odo: 19400,
      status: VehicleStatus.ASSIGNED,
    },
    {
      reg: 'TN-14-BZ-4512',
      make: 'Force Motors',
      model: 'Traveller 17-Seater Executive Bus',
      type: VehicleType.BUS,
      fuel: FuelType.DIESEL,
      branch: branchCHN,
      client: client3,
      year: 2023,
      odo: 35600,
      status: VehicleStatus.AVAILABLE,
    },
  ];

  const seededVehicles: any[] = [];

  for (const vData of vehiclesData) {
    const v = await prisma.vehicle.upsert({
      where: { agencyId_vehicleRegistrationNumber: { agencyId: agency.id, vehicleRegistrationNumber: vData.reg } },
      update: {},
      create: {
        agencyId: agency.id,
        branchId: vData.branch.id,
        clientId: vData.client?.id,
        vehicleRegistrationNumber: vData.reg,
        vehicleMake: vData.make,
        vehicleModel: vData.model,
        vehicleType: vData.type,
        fuelType: vData.fuel,
        chassisNumber: `MAT45${Math.floor(100000 + Math.random() * 900000)}B`,
        engineNumber: `ENG98${Math.floor(100000 + Math.random() * 900000)}`,
        manufacturingYear: vData.year,
        currentOdometerKm: vData.odo,
        status: vData.status,
      }
    });
    seededVehicles.push(v);
  }

  // Assign Driver Ramesh Kumar to Tata Winger
  const driverRamesh = seededEmployees[0];
  const vehicleWinger = seededVehicles[0];
  let wingerAssign = await prisma.vehicleAssignment.findFirst({
    where: { vehicleId: vehicleWinger.id, employeeId: driverRamesh.id }
  });
  if (!wingerAssign) {
    wingerAssign = await prisma.vehicleAssignment.create({
      data: {
        vehicleId: vehicleWinger.id,
        employeeId: driverRamesh.id,
        clientSiteId: siteTVS.id,
        startDatetime: new Date('2026-01-01T08:00:00Z'),
        startOdometerKm: 38000,
        handoverConditionNotes: 'Vehicle delivered clean with spare tire, jack, tool kit, and valid insurance certificate.',
        assignedById: adminUser.id,
      }
    });
  }

  // ==========================================
  // 5. SEED LIVE DEPLOYMENTS
  // ==========================================
  console.log('  -> Seeding Active Employee Site Deployments...');

  const deploymentsData = [
    // TVS Trichy Site: Driver Ramesh
    {
      emp: seededEmployees[0], // Ramesh (Driver)
      client: client1,
      site: siteTVS,
      desig: desigDriver,
      rate: rateTvsDriver,
      sal: salaryStructures[0],
      vehicle: seededVehicles[0],
      shiftName: 'MORNING_LOGISTICS',
      start: new Date('2026-01-01'),
    },
    // TVS Trichy Site: Driver Senthil
    {
      emp: seededEmployees[1], // Senthil (Driver)
      client: client1,
      site: siteTVS,
      desig: desigDriver,
      rate: rateTvsDriver,
      sal: salaryStructures[1],
      vehicle: seededVehicles[1],
      shiftName: 'EVENING_LOGISTICS',
      start: new Date('2026-01-01'),
    },
    // TVS Trichy Site: Security Rajesh
    {
      emp: seededEmployees[2], // Rajesh (Security)
      client: client1,
      site: siteTVS,
      desig: desigSecurity,
      rate: rateTvsSecurity,
      sal: salaryStructures[2],
      vehicle: null,
      shiftName: 'DAY_GUARD',
      start: new Date('2026-01-15'),
    },
    // TVS Trichy Site: Security Priya
    {
      emp: seededEmployees[3], // Priya (Security)
      client: client1,
      site: siteTVS,
      desig: desigSecurity,
      rate: rateTvsSecurity,
      sal: salaryStructures[3],
      vehicle: null,
      shiftName: 'GATE_ENTRY',
      start: new Date('2026-02-01'),
    },
    // Apollo Chennai: Driver Vigneshwaran
    {
      emp: seededEmployees[4], // Vigneshwaran (Driver)
      client: client2,
      site: siteApollo,
      desig: desigDriver,
      rate: rateApolloDriver,
      sal: salaryStructures[4],
      vehicle: seededVehicles[2],
      shiftName: 'EMERGENCY_AMBULANCE',
      start: new Date('2026-04-01'),
    },
    // Apollo Chennai: Supervisor Anand Raj
    {
      emp: seededEmployees[5], // Anand Raj (Supervisor)
      client: client2,
      site: siteApollo,
      desig: desigSupervisor,
      rate: rateApolloSecurity,
      sal: salaryStructures[5],
      vehicle: null,
      shiftName: 'GENERAL_SUPERVISION',
      start: new Date('2026-04-01'),
    },
    // Apollo Chennai: Security Mohamed Farooq
    {
      emp: seededEmployees[6], // Mohamed Farooq
      client: client2,
      site: siteApollo,
      desig: desigSecurity,
      rate: rateApolloSecurity,
      sal: salaryStructures[6],
      vehicle: null,
      shiftName: 'ICU_BLOCK_GUARD',
      start: new Date('2026-04-01'),
    },
    // Apollo Chennai: Security Karthi Murugan
    {
      emp: seededEmployees[7], // Karthi Murugan
      client: client2,
      site: siteApollo,
      desig: desigSecurity,
      rate: rateApolloSecurity,
      sal: salaryStructures[7],
      vehicle: null,
      shiftName: 'NIGHT_PATROL',
      start: new Date('2026-04-01'),
    },
  ];

  const seededDeployments: any[] = [];

  for (const dData of deploymentsData) {
    let dep = await prisma.employeeDeployment.findFirst({
      where: {
        employeeId: dData.emp.id,
        clientId: dData.client.id,
        clientSiteId: dData.site.id,
        status: DeploymentStatus.ACTIVE,
      }
    });

    if (!dep) {
      dep = await prisma.employeeDeployment.create({
        data: {
          agencyId: agency.id,
          branchId: dData.emp.branchId,
          employeeId: dData.emp.id,
          clientId: dData.client.id,
          clientSiteId: dData.site.id,
          designationId: dData.desig.id,
          shiftName: dData.shiftName,
          startDate: dData.start,
          billingRateId: dData.rate.id,
          salaryStructureId: dData.sal.id,
          vehicleId: dData.vehicle?.id,
          status: DeploymentStatus.ACTIVE,
        }
      });
    }
    seededDeployments.push(dep);
  }

  // ==========================================
  // 6. SEED DAILY SHIFT ATTENDANCE (PAST 14 DAYS)
  // ==========================================
  console.log('  -> Seeding Biometric & Shift Attendance Logs...');

  const today = new Date();
  for (let dayOffset = 1; dayOffset <= 14; dayOffset++) {
    const shiftDate = new Date(today);
    shiftDate.setDate(today.getDate() - dayOffset);
    shiftDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < seededDeployments.length; i++) {
      const dep = seededDeployments[i];
      // Skip if weekend (Sunday)
      const dayOfWeek = shiftDate.getDay();
      const isSunday = dayOfWeek === 0;

      const existingAtt = await prisma.attendance.findUnique({
        where: { employeeId_shiftBusinessDate: { employeeId: dep.employeeId, shiftBusinessDate: shiftDate } }
      });

      if (!existingAtt) {
        let status: AttendanceStatus = isSunday ? AttendanceStatus.WEEK_OFF : AttendanceStatus.PRESENT;
        // Random 1 absent day for variety
        if (dayOffset === 3 && i === 1) status = AttendanceStatus.ABSENT;

        const scheduledHours = isSunday ? 0 : 8.00;
        const workedHours = status === AttendanceStatus.PRESENT ? 8.00 : 0.00;
        const overtimeHours = (status === AttendanceStatus.PRESENT && (dayOffset % 3 === 0)) ? 2.00 : 0.00;

        await prisma.attendance.create({
          data: {
            agencyId: agency.id,
            branchId: dep.branchId,
            employeeId: dep.employeeId,
            deploymentId: dep.id,
            clientId: dep.clientId,
            clientSiteId: dep.clientSiteId,
            shiftBusinessDate: shiftDate,
            clockInTime: status === AttendanceStatus.PRESENT ? new Date(shiftDate.getTime() + 9 * 3600 * 1000) : null,
            clockOutTime: status === AttendanceStatus.PRESENT ? new Date(shiftDate.getTime() + (17 + Number(overtimeHours)) * 3600 * 1000) : null,
            status,
            scheduledHours,
            workedHours,
            overtimeHours,
            recordedMethod: AttendanceMethod.BIOMETRIC,
            recordedById: adminUser.id,
            supervisorRemarks: status === AttendanceStatus.PRESENT ? 'Verified on biometric reader' : isSunday ? 'Scheduled Weekly Rest' : 'Unplanned Absence',
            isApproved: true,
            approvedById: adminUser.id,
            isLocked: false,
          }
        });
      }
    }
  }

  // ==========================================
  // 7. SEED LEAVE & REPLACEMENTS
  // ==========================================
  console.log('  -> Seeding Leave Applications & Standby Replacements...');

  const leaveReq = await prisma.leaveRequest.create({
    data: {
      employeeId: seededEmployees[1].id, // Senthil Nathan
      leaveTypeId: ltCasual.id,
      startDate: new Date(today.getTime() + 2 * 86400000),
      endDate: new Date(today.getTime() + 3 * 86400000),
      totalDays: 2.0,
      reason: 'Family temple festival in native village Pudukkottai',
      status: LeaveStatus.APPROVED,
      reviewedById: adminUser.id,
      reviewedAt: new Date(),
      reviewerComments: 'Approved. Standby driver Balaji Venkatesh dispatched.',
    }
  });

  // Replacement dispatch
  await prisma.replacement.create({
    data: {
      originalDeploymentId: seededDeployments[1].id,
      absentEmployeeId: seededEmployees[1].id, // Senthil
      replacementEmployeeId: seededEmployees[9].id, // Balaji
      startDate: new Date(today.getTime() + 2 * 86400000),
      endDate: new Date(today.getTime() + 3 * 86400000),
      replacementType: ReplacementType.TEMPORARY,
      reason: 'Scheduled casual leave coverage for logistics route',
      status: ReplacementStatus.DISPATCHED,
      dispatchedById: adminUser.id,
    }
  });

  // ==========================================
  // 8. SEED PAYROLL BATCH & PAYSLIPS
  // ==========================================
  console.log('  -> Seeding Processed Payroll Batch & Generated Payslips...');

  const curMonth = today.getMonth() + 1;
  const curYear = today.getFullYear();
  const batchNumber = `PAY-TRC-${curYear}${curMonth.toString().padStart(2, '0')}`;

  let payrollBatch = await prisma.payrollBatch.findUnique({
    where: { batchNumber }
  });

  if (!payrollBatch) {
    payrollBatch = await prisma.payrollBatch.create({
      data: {
        agencyId: agency.id,
        branchId: branchTRC.id,
        batchNumber,
        month: curMonth,
        year: curYear,
        totalEmployees: 4,
        totalGrossWages: 78500.00,
        totalDeductions: 10450.00,
        totalNetWages: 68050.00,
        status: PayrollBatchStatus.APPROVED,
        approvedById: adminUser.id,
        approvedAt: new Date(),
        lockedAt: new Date(),
      }
    });

    // Create calculations & payslips for TRC employees
    for (let i = 0; i < 4; i++) {
      const emp = seededEmployees[i];
      const sal = salaryStructures[i];
      const basicEarned = Number(sal.basicPay);
      const daEarned = Number(sal.dearnessAllowance);
      const hraEarned = Number(sal.houseRentAllowance);
      const convEarned = Number(sal.conveyanceAllowance);
      const specialEarned = Number(sal.specialAllowance);
      const gross = basicEarned + daEarned + hraEarned + convEarned + specialEarned;

      // EPF 12% on Basic + DA (capped at 15000)
      const epfBasis = Math.min(basicEarned + daEarned, 15000);
      const epfEmp = Math.round(epfBasis * 0.12);
      const epfEmpr = Math.round(epfBasis * 0.0367);
      const epfEps = Math.round(epfBasis * 0.0833);

      // ESIC 0.75% on Gross if gross <= 21000
      const esicEmp = gross <= 21000 ? Math.ceil(gross * 0.0075) : 0;
      const esicEmpr = gross <= 21000 ? Math.ceil(gross * 0.0325) : 0;

      // Professional Tax (TN Slab)
      const pt = gross > 12500 ? 125.00 : 0.00;
      const lwf = 20.00;
      const totalDed = epfEmp + esicEmp + pt + lwf;
      const net = gross - totalDed;

      const calc = await prisma.salaryCalculation.create({
        data: {
          payrollBatchId: payrollBatch.id,
          employeeId: emp.id,
          salaryStructureId: sal.id,
          month: curMonth,
          year: curYear,
          totalCalendarDays: 30,
          presentDays: 26.0,
          paidLeaveDays: 0.0,
          unpaidLeaveDays: 0.0,
          weekOffDays: 4.0,
          payableDays: 30.0,
          overtimeHours: 6.0,
          basicEarned,
          daEarned,
          hraEarned,
          conveyanceEarned: convEarned,
          specialAllowanceEarned: specialEarned,
          overtimeAmount: 720.00,
          grossSalary: gross + 720.00,
          epfEmployee: epfEmp,
          epfEmployer: epfEmpr,
          epfEpsEmployer: epfEps,
          esicEmployee: esicEmp,
          esicEmployer: esicEmpr,
          professionalTax: pt,
          lwfEmployee: lwf,
          totalDeductions: totalDed,
          netSalary: (gross + 720.00) - totalDed,
          bankAccountNoSnapshot: emp.bankAccountNoMasked,
          bankIfscSnapshot: emp.bankIfsc,
          paymentStatus: SalaryPaymentStatus.PAID,
        }
      });

      // Generate Payslip
      await prisma.payslip.create({
        data: {
          salaryCalculationId: calc.id,
          employeeId: emp.id,
          payslipNumber: `SLIP-TRC-${curYear}${curMonth.toString().padStart(2, '0')}-${emp.employeeCode}`,
          month: curMonth,
          year: curYear,
          isPublished: true,
          publishedAt: new Date(),
          snapshotData: {
            employee_name: `${emp.firstName} ${emp.lastName}`,
            employee_code: emp.employeeCode,
            designation: designations.find(d => d.id === emp.primaryDesignationId)?.name,
            bank_name: emp.bankName,
            bank_account_masked: emp.bankAccountNoMasked,
            uan: emp.uanNumber,
            esic_ip: emp.esicIpNumber,
            earnings: {
              basic: basicEarned,
              da: daEarned,
              hra: hraEarned,
              conveyance: convEarned,
              special: specialEarned,
              overtime: 720.00,
              gross_total: gross + 720.00,
            },
            deductions: {
              epf_employee: epfEmp,
              esic_employee: esicEmp,
              professional_tax: pt,
              lwf: lwf,
              total_deductions: totalDed,
            },
            net_payable: (gross + 720.00) - totalDed,
          }
        }
      });
    }
  }

  // ==========================================
  // 9. SEED CLIENT INVOICES & GST BILLING
  // ==========================================
  console.log('  -> Seeding GST Invoices & Payment Receipts...');

  const invoiceNumber1 = 'TRC/INV/2026-27/0001';
  let invoice1 = await prisma.clientInvoice.findUnique({
    where: { invoiceNumber: invoiceNumber1 }
  });

  if (!invoice1) {
    const subtotal = 145000.00;
    const cgst = subtotal * 0.09;
    const sgst = subtotal * 0.09;
    const total = subtotal + cgst + sgst;

    invoice1 = await prisma.clientInvoice.create({
      data: {
        agencyId: agency.id,
        branchId: branchTRC.id,
        clientId: client1.id,
        contractId: contractTVS.id,
        invoiceNumber: invoiceNumber1,
        invoiceDate: new Date('2026-09-01'),
        dueDate: new Date('2026-09-30'),
        billingPeriodStart: new Date('2026-08-01'),
        billingPeriodEnd: new Date('2026-08-31'),
        subtotalAmount: subtotal,
        isInterstate: false,
        cgstRate: 9.00,
        cgstAmount: cgst,
        sgstRate: 9.00,
        sgstAmount: sgst,
        totalTaxAmount: cgst + sgst,
        roundOff: 0.00,
        totalInvoiceAmount: total,
        paidAmount: total,
        balanceDue: 0.00,
        status: InvoiceStatus.PAID,
        isLocked: true,
        approvedById: adminUser.id,
      }
    });

    // Invoice Line items
    await prisma.clientInvoiceItem.create({
      data: {
        invoiceId: invoice1.id,
        clientSiteId: siteTVS.id,
        designationId: desigDriver.id,
        billingRateId: rateTvsDriver.id,
        description: 'Heavy Commercial Drivers - 2 Drivers x 26 Shifts (8 hrs/shift)',
        billingModel: BillingModel.PER_EMPLOYEE_PER_SHIFT,
        quantityShiftsOrHours: 52,
        rateApplied: 1150.00,
        overtimeHours: 16.00,
        overtimeRate: 180.00,
        lineTotal: (52 * 1150) + (16 * 180),
      }
    });

    await prisma.clientInvoiceItem.create({
      data: {
        invoiceId: invoice1.id,
        clientSiteId: siteTVS.id,
        designationId: desigSecurity.id,
        billingRateId: rateTvsSecurity.id,
        description: 'Facility Security Personnel - 4 Guards x 26 Shifts (Round the Clock)',
        billingModel: BillingModel.PER_EMPLOYEE_PER_SHIFT,
        quantityShiftsOrHours: 94,
        rateApplied: 850.00,
        overtimeHours: 18.00,
        overtimeRate: 140.00,
        lineTotal: (94 * 850) + (18 * 140),
      }
    });

    // Payment recorded
    await prisma.clientPayment.create({
      data: {
        agencyId: agency.id,
        branchId: branchTRC.id,
        clientId: client1.id,
        invoiceId: invoice1.id,
        paymentDate: new Date('2026-09-15'),
        amountReceived: total,
        tdsDeducted: 2900.00,
        paymentMode: PaymentMode.NEFT,
        referenceTransactionId: 'HDFCR520260915998124',
        bankName: 'HDFC Bank Ltd',
        recordedById: adminUser.id,
        notes: 'Full payment cleared via corporate NEFT advice.',
      }
    });
  }

  // Second active invoice for Apollo (Pending payment)
  const invoiceNumber2 = 'CHN/INV/2026-27/0001';
  let invoice2 = await prisma.clientInvoice.findUnique({
    where: { invoiceNumber: invoiceNumber2 }
  });

  if (!invoice2) {
    const subtotal = 192000.00;
    const cgst = subtotal * 0.09;
    const sgst = subtotal * 0.09;
    const total = subtotal + cgst + sgst;

    invoice2 = await prisma.clientInvoice.create({
      data: {
        agencyId: agency.id,
        branchId: branchCHN.id,
        clientId: client2.id,
        contractId: contractApollo.id,
        invoiceNumber: invoiceNumber2,
        invoiceDate: new Date('2026-09-05'),
        dueDate: new Date('2026-10-05'),
        billingPeriodStart: new Date('2026-08-01'),
        billingPeriodEnd: new Date('2026-08-31'),
        subtotalAmount: subtotal,
        isInterstate: false,
        cgstRate: 9.00,
        cgstAmount: cgst,
        sgstRate: 9.00,
        sgstAmount: sgst,
        totalTaxAmount: cgst + sgst,
        roundOff: 0.00,
        totalInvoiceAmount: total,
        paidAmount: 0.00,
        balanceDue: total,
        status: InvoiceStatus.SENT,
        isLocked: true,
        approvedById: adminUser.id,
      }
    });

    await prisma.clientInvoiceItem.create({
      data: {
        invoiceId: invoice2.id,
        clientSiteId: siteApollo.id,
        designationId: desigSecurity.id,
        billingRateId: rateApolloSecurity.id,
        description: 'Hospital Safety & Emergency Guarding - 8 Guards x 26 Shifts',
        billingModel: BillingModel.PER_EMPLOYEE_PER_SHIFT,
        quantityShiftsOrHours: 208,
        rateApplied: 900.00,
        overtimeHours: 32.00,
        overtimeRate: 150.00,
        lineTotal: (208 * 900) + (32 * 150),
      }
    });
  }

  // ==========================================
  // 10. SEED COMPLIANCE DOCUMENTS & EXPIRIES
  // ==========================================
  console.log('  -> Seeding Compliance Documents & Expiry Alerts...');

  if (docRC) {
    const doc = await prisma.document.create({
      data: {
        agencyId: agency.id,
        branchId: branchTRC.id,
        documentTypeId: docRC.id,
        entityType: DocumentEntityType.VEHICLE,
        entityId: seededVehicles[0].id,
        documentNumber: 'RC-TN45-AQ-1024',
        title: 'Tata Winger Registration Certificate (RC)',
        description: 'Commercial passenger vehicle RC book issued by RTO Tiruchirappalli',
        issuedBy: 'RTO Tiruchirappalli (TN-45)',
        issueDate: new Date('2023-01-10'),
        expiryDate: new Date('2028-01-09'),
        storageProvider: 'S3_COMPLIANT',
        s3StorageKey: 'documents/vehicles/tn45aq1024_rc.pdf',
        originalFileName: 'tn45aq1024_rc.pdf',
        fileSizeBytes: 245780,
        mimeType: 'application/pdf',
        verificationStatus: VerificationStatus.VERIFIED,
        uploadedById: adminUser.id,
        verifiedById: adminUser.id,
        verifiedAt: new Date(),
      }
    });

    // Alert for vehicle RC
    await prisma.expiryAlert.create({
      data: {
        agencyId: agency.id,
        documentId: doc.id,
        entityType: DocumentEntityType.VEHICLE,
        entityId: seededVehicles[0].id,
        expiryDate: new Date('2028-01-09'),
        alertThresholdDays: 60,
        scheduledAlertDate: new Date('2027-11-10'),
        status: ExpiryAlertStatus.SCHEDULED,
      }
    });
  }

  // ==========================================
  // 11. SEED RECRUITMENT & NOTIFICATIONS
  // ==========================================
  console.log('  -> Seeding Recruitment Candidates & System Notifications...');

  const candidate1 = await prisma.recruitmentCandidate.upsert({
    where: { candidateCode: 'CAN-2026-0041' },
    update: {},
    create: {
      agencyId: agency.id,
      branchId: branchCHN.id,
      candidateCode: 'CAN-2026-0041',
      firstName: 'Kavitha',
      lastName: 'Ganesan',
      phone: '+91 98403 77889',
      email: 'kavitha.ganesan@gmail.com',
      dateOfBirth: new Date('1997-06-12'),
      gender: Gender.FEMALE,
      currentCity: 'Chennai',
      primaryDesignationId: desigSecurity.id,
      yearsOfExperience: 2.5,
      skills: ['Access Control', 'CCTV Surveillance', 'First Aid'],
      source: 'PORTAL_APPLICATION',
      status: RecruitmentStatus.SELECTED,
      expectedSalary: 14000.00,
      screeningNotes: 'Experienced female security officer. Prior work at Phoenix MarketCity.',
      screenedById: adminUser.id,
      screenedAt: new Date(),
    }
  });

  // Create Offer for candidate
  await prisma.candidateOffer.create({
    data: {
      agencyId: agency.id,
      candidateId: candidate1.id,
      designationId: desigSecurity.id,
      branchId: branchCHN.id,
      offeredSalary: 13500.00,
      joiningDate: new Date(today.getTime() + 10 * 86400000),
      status: CandidateOfferStatus.ACCEPTED,
      notes: 'Offer letter signed. Deployment planned for Apollo Greams Road.',
    }
  });

  // System Notifications
  const notificationsData = [
    {
      title: 'Payroll Batch Approved',
      body: `Payroll batch ${batchNumber} for ${curMonth}/${curYear} has been finalized. 4 employee payslips generated.`,
      category: NotificationCategory.PAYROLL,
      priority: NotificationPriority.NORMAL,
      actionUrl: '/dashboard/payroll',
    },
    {
      title: 'Tax Invoice Generated',
      body: `Invoice ${invoiceNumber2} for Apollo Specialty Hospitals issued for Rs. 2,26,560.00 (Due: 05-Oct-2026).`,
      category: NotificationCategory.BILLING,
      priority: NotificationPriority.NORMAL,
      actionUrl: '/dashboard/billing',
    },
    {
      title: 'Standby Replacement Dispatched',
      body: 'Balaji Venkatesh dispatched to cover logistics route for absent driver Senthil Nathan.',
      category: NotificationCategory.REPLACEMENT,
      priority: NotificationPriority.HIGH,
      actionUrl: '/dashboard/replacements',
    },
    {
      title: 'New Candidate Offer Accepted',
      body: 'Kavitha Ganesan accepted offer for Security Officer position at Chennai Branch.',
      category: NotificationCategory.RECRUITMENT,
      priority: NotificationPriority.LOW,
      actionUrl: '/dashboard/recruitment',
    },
  ];

  for (const notif of notificationsData) {
    await prisma.notification.create({
      data: {
        agencyId: agency.id,
        branchId: branchTRC.id,
        userId: adminUser.id,
        title: notif.title,
        body: notif.body,
        category: notif.category,
        priority: notif.priority,
        actionUrl: notif.actionUrl,
        isRead: false,
      }
    });
  }

  console.log('✅ All dynamic operations data seeded successfully!');
  console.log('   - 3 Clients with Sites, Contracts & Rate Cards');
  console.log('   - 10 Employees with Salary Structures & Leave Balances');
  console.log('   - 4 Fleet Vehicles with Driver Assignments');
  console.log('   - 8 Live Deployments');
  console.log('   - 100+ Biometric Attendance Logs');
  console.log('   - Approved Leaves & Dispatched Standby Replacements');
  console.log('   - Processed Payroll Batch & 4 Generated Payslips');
  console.log('   - 2 GST Tax Invoices (1 Paid, 1 Sent)');
  console.log('   - Compliance Documents & Expiry Alerts');
  console.log('   - Recruitment Candidate & Accepted Offer');
  console.log('   - Live System Notifications');
}

main()
  .catch((e) => {
    console.error('❌ Dynamic data seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
