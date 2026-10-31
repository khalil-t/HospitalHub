import { Repository } from 'typeorm';
import { UserRole } from '../../common/enums/user-role.enum';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { ExternalDoctorRequest } from '../../external-doctors/entities/external-doctor-request.entity';
import { Patient } from '../entities/patient.entity';
import { PatientAccessPolicy } from './patient-access.policy';

const SERVICE_A = '00000000-0000-4000-8000-00000000000a';
const SERVICE_B = '00000000-0000-4000-8000-00000000000b';
const PATIENT_A = '00000000-0000-4000-8000-000000000101';
const PATIENT_B = '00000000-0000-4000-8000-000000000102';
const DOCTOR_A = '00000000-0000-4000-8000-000000000201';

const ALL_ROLES = Object.values(UserRole);

function user(
  role: UserRole,
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser {
  return {
    id: DOCTOR_A,
    email: 'fake.user@example.test',
    roles: [role],
    serviceId: SERVICE_A,
    ...overrides,
  };
}

function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: PATIENT_A,
    firstName: 'Fake',
    lastName: 'Patient',
    services: [{ id: SERVICE_A }],
    medicalRecords: [{ responsibleDoctors: [{ id: DOCTOR_A }] }],
    ...overrides,
  } as unknown as Patient;
}

function createPolicy(
  patient: Patient | null,
  sharedPatients: string[] = [],
): PatientAccessPolicy {
  const patientRepository = {
    findOne: jest.fn().mockResolvedValue(patient),
  } as unknown as Repository<Patient>;

  const sharedRequest =
    sharedPatients.length > 0
      ? { patients: sharedPatients.map((id) => ({ id })) }
      : null;

  const externalDoctorRequestRepository = {
    createQueryBuilder: jest.fn().mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(sharedRequest),
    }),
  } as unknown as Repository<ExternalDoctorRequest>;

  return new PatientAccessPolicy(
    patientRepository,
    externalDoctorRequestRepository,
  );
}

describe('PatientAccessPolicy.canView', () => {
  it.each([
    [UserRole.SUPER_ADMIN, true],
    [UserRole.SERVICE_HEAD, false],
    [UserRole.INTERNAL_DOCTOR, true],
    [UserRole.EXTERNAL_DOCTOR, false],
    [UserRole.ADMISSION_AGENT, true],
    [UserRole.VERIFICATION_CLERK, false],
    [UserRole.RADIOLOGIST, false],
    [UserRole.LABORATORY_TECHNICIAN, false],
  ])('%s -> %s', async (role, expected) => {
    const policy = createPolicy(makePatient());
    await expect(policy.canView(user(role), PATIENT_A)).resolves.toBe(expected);
  });

  it('returns false for a missing patient', async () => {
    const policy = createPolicy(null);
    await expect(
      policy.canView(user(UserRole.SUPER_ADMIN), PATIENT_A),
    ).resolves.toBe(false);
  });

  it('allows an internal doctor in another service when assigned', async () => {
    const policy = createPolicy(makePatient());
    await expect(
      policy.canView(
        user(UserRole.INTERNAL_DOCTOR, { serviceId: SERVICE_B }),
        PATIENT_A,
      ),
    ).resolves.toBe(true);
  });

  it('denies an internal doctor outside the service and not assigned', async () => {
    const policy = createPolicy(
      makePatient({ medicalRecords: [{ responsibleDoctors: [] }] }),
    );
    await expect(
      policy.canView(
        user(UserRole.INTERNAL_DOCTOR, { serviceId: SERVICE_B }),
        PATIENT_A,
      ),
    ).resolves.toBe(false);
  });

  it('denies a user without a service', async () => {
    const policy = createPolicy(makePatient());
    await expect(
      policy.canView(
        user(UserRole.ADMISSION_AGENT, { serviceId: null }),
        PATIENT_A,
      ),
    ).resolves.toBe(false);
  });

  it('allows an external doctor only for a shared patient', async () => {
    const sharedPolicy = createPolicy(makePatient(), [PATIENT_A]);
    const unsharedPolicy = createPolicy(makePatient(), [PATIENT_B]);

    await expect(
      sharedPolicy.canView(user(UserRole.EXTERNAL_DOCTOR), PATIENT_A),
    ).resolves.toBe(true);
    await expect(
      unsharedPolicy.canView(user(UserRole.EXTERNAL_DOCTOR), PATIENT_A),
    ).resolves.toBe(false);
  });

  it('denies an external doctor without an email', async () => {
    const policy = createPolicy(makePatient(), [PATIENT_A]);
    await expect(
      policy.canView(
        user(UserRole.EXTERNAL_DOCTOR, { email: undefined }),
        PATIENT_A,
      ),
    ).resolves.toBe(false);
  });

  it('supports multiple roles using the least restrictive applicable rule', async () => {
    const policy = createPolicy(makePatient());
    await expect(
      policy.canView(
        {
          id: DOCTOR_A,
          email: 'fake.user@example.test',
          roles: [UserRole.VERIFICATION_CLERK, UserRole.INTERNAL_DOCTOR],
          serviceId: SERVICE_A,
        },
        PATIENT_A,
      ),
    ).resolves.toBe(true);
  });
});

describe('PatientAccessPolicy.canUpdate', () => {
  it.each([
    [UserRole.SUPER_ADMIN, true],
    [UserRole.SERVICE_HEAD, false],
    [UserRole.INTERNAL_DOCTOR, true],
    [UserRole.EXTERNAL_DOCTOR, false],
    [UserRole.ADMISSION_AGENT, true],
    [UserRole.VERIFICATION_CLERK, false],
    [UserRole.RADIOLOGIST, false],
    [UserRole.LABORATORY_TECHNICIAN, false],
  ])('%s -> %s', async (role, expected) => {
    const policy = createPolicy(makePatient());
    await expect(policy.canUpdate(user(role), PATIENT_A)).resolves.toBe(
      expected,
    );
  });

  it('denies an internal doctor outside the service even when assigned', async () => {
    const policy = createPolicy(makePatient());
    await expect(
      policy.canUpdate(
        user(UserRole.INTERNAL_DOCTOR, { serviceId: SERVICE_B }),
        PATIENT_A,
      ),
    ).resolves.toBe(false);
  });
});

describe('PatientAccessPolicy.canDelete', () => {
  it.each(ALL_ROLES)('%s', async (role) => {
    const policy = createPolicy(makePatient());
    await expect(policy.canDelete(user(role), PATIENT_A)).resolves.toBe(
      role === UserRole.SUPER_ADMIN,
    );
  });
});

describe('PatientAccessPolicy.canManageServices', () => {
  it.each([
    [UserRole.SUPER_ADMIN, true],
    [UserRole.SERVICE_HEAD, false],
    [UserRole.INTERNAL_DOCTOR, false],
    [UserRole.EXTERNAL_DOCTOR, false],
    [UserRole.ADMISSION_AGENT, true],
    [UserRole.VERIFICATION_CLERK, false],
    [UserRole.RADIOLOGIST, false],
    [UserRole.LABORATORY_TECHNICIAN, false],
  ])('%s -> %s', async (role, expected) => {
    const policy = createPolicy(makePatient());
    await expect(policy.canManageServices(user(role), PATIENT_A)).resolves.toBe(
      expected,
    );
  });

  it('denies an admission agent outside the service', async () => {
    const policy = createPolicy(makePatient());
    await expect(
      policy.canManageServices(
        user(UserRole.ADMISSION_AGENT, { serviceId: SERVICE_B }),
        PATIENT_A,
      ),
    ).resolves.toBe(false);
  });
});
