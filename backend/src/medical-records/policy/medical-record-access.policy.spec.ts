import { Repository } from 'typeorm';
import { UserRole } from '../../common/enums/user-role.enum';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { ExternalDoctorRequest } from '../../external-doctors/entities/external-doctor-request.entity';
import { Patient } from '../../patients/entities/patient.entity';
import { PatientAccessPolicy } from '../../patients/policy/patient-access.policy';
import { MedicalRecord } from '../entities/medical-record.entity';
import { MedicalRecordAccessPolicy } from './medical-record-access.policy';

const SERVICE_A = '00000000-0000-4000-8000-00000000000a';
const SERVICE_B = '00000000-0000-4000-8000-00000000000b';
const PATIENT_A = '00000000-0000-4000-8000-000000000101';
const PATIENT_B = '00000000-0000-4000-8000-000000000102';
const RECORD_A = '00000000-0000-4000-8000-000000000301';
const DOCTOR_A = '00000000-0000-4000-8000-000000000201';
const DOCTOR_B = '00000000-0000-4000-8000-000000000202';

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

function makeRecord(overrides: Partial<MedicalRecord> = {}): MedicalRecord {
  return {
    id: RECORD_A,
    patient: { id: PATIENT_A },
    authorId: DOCTOR_A,
    ...overrides,
  } as MedicalRecord;
}

function makePatient(responsibleDoctorIds: string[] = [DOCTOR_A]): Patient {
  return {
    id: PATIENT_A,
    services: [{ id: SERVICE_A }],
    medicalRecords: [
      { responsibleDoctors: responsibleDoctorIds.map((id) => ({ id })) },
    ],
  } as unknown as Patient;
}

function createPolicy(options: {
  record?: MedicalRecord | null;
  patient?: Patient | null;
  sharedPatients?: string[];
  patientCanView?: boolean;
}): MedicalRecordAccessPolicy {
  const recordRepository = {
    findOne: jest.fn().mockResolvedValue(options.record ?? null),
  } as unknown as Repository<MedicalRecord>;

  const patientRepository = {
    findOne: jest.fn().mockResolvedValue(options.patient ?? null),
  } as unknown as Repository<Patient>;

  const sharedRequest =
    options.sharedPatients && options.sharedPatients.length > 0
      ? { patients: options.sharedPatients.map((id) => ({ id })) }
      : null;

  const externalDoctorRequestRepository = {
    createQueryBuilder: jest.fn().mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(sharedRequest),
    }),
  } as unknown as Repository<ExternalDoctorRequest>;

  const patientAccessPolicy = {
    canView: jest.fn().mockResolvedValue(options.patientCanView ?? true),
  } as unknown as PatientAccessPolicy;

  return new MedicalRecordAccessPolicy(
    recordRepository,
    patientRepository,
    externalDoctorRequestRepository,
    patientAccessPolicy,
  );
}

describe('MedicalRecordAccessPolicy.canView', () => {
  it.each([
    [UserRole.SUPER_ADMIN, true],
    [UserRole.SERVICE_HEAD, false],
    [UserRole.INTERNAL_DOCTOR, true],
    [UserRole.EXTERNAL_DOCTOR, false],
    [UserRole.ADMISSION_AGENT, false],
    [UserRole.VERIFICATION_CLERK, false],
    [UserRole.RADIOLOGIST, false],
    [UserRole.LABORATORY_TECHNICIAN, false],
  ])('%s -> %s', async (role, expected) => {
    const policy = createPolicy({ record: makeRecord() });
    await expect(policy.canView(user(role), RECORD_A)).resolves.toBe(expected);
  });

  it('returns false when the record or its patient is missing', async () => {
    const missingRecord = createPolicy({ record: null });
    const missingPatient = createPolicy({
      record: makeRecord({ patient: null }),
    });

    await expect(
      missingRecord.canView(user(UserRole.SUPER_ADMIN), RECORD_A),
    ).resolves.toBe(false);
    await expect(
      missingPatient.canView(user(UserRole.SUPER_ADMIN), RECORD_A),
    ).resolves.toBe(false);
  });

  it('delegates internal doctor scope to the patient policy', async () => {
    const allowed = createPolicy({
      record: makeRecord(),
      patientCanView: true,
    });
    const denied = createPolicy({
      record: makeRecord(),
      patientCanView: false,
    });

    await expect(
      allowed.canView(user(UserRole.INTERNAL_DOCTOR), RECORD_A),
    ).resolves.toBe(true);
    await expect(
      denied.canView(user(UserRole.INTERNAL_DOCTOR), RECORD_A),
    ).resolves.toBe(false);
  });

  it('allows an external doctor only for a shared patient', async () => {
    const shared = createPolicy({
      record: makeRecord(),
      sharedPatients: [PATIENT_A],
    });
    const unshared = createPolicy({
      record: makeRecord(),
      sharedPatients: [PATIENT_B],
    });

    await expect(
      shared.canView(user(UserRole.EXTERNAL_DOCTOR), RECORD_A),
    ).resolves.toBe(true);
    await expect(
      unshared.canView(user(UserRole.EXTERNAL_DOCTOR), RECORD_A),
    ).resolves.toBe(false);
  });

  it('does not evaluate the patient policy for super admins', async () => {
    const policy = createPolicy({
      record: makeRecord(),
      patientCanView: false,
    });

    await expect(
      policy.canView(user(UserRole.SUPER_ADMIN), RECORD_A),
    ).resolves.toBe(true);
  });
});

describe('MedicalRecordAccessPolicy.canViewByPatient', () => {
  it.each([
    [UserRole.SUPER_ADMIN, true],
    [UserRole.SERVICE_HEAD, false],
    [UserRole.INTERNAL_DOCTOR, true],
    [UserRole.EXTERNAL_DOCTOR, false],
    [UserRole.ADMISSION_AGENT, false],
    [UserRole.VERIFICATION_CLERK, false],
    [UserRole.RADIOLOGIST, false],
    [UserRole.LABORATORY_TECHNICIAN, false],
  ])('%s -> %s', async (role, expected) => {
    const policy = createPolicy({ patient: makePatient() });
    await expect(policy.canViewByPatient(user(role), PATIENT_A)).resolves.toBe(
      expected,
    );
  });

  it('allows an external doctor only for a shared patient', async () => {
    const policy = createPolicy({ sharedPatients: [PATIENT_A] });
    await expect(
      policy.canViewByPatient(user(UserRole.EXTERNAL_DOCTOR), PATIENT_A),
    ).resolves.toBe(true);
  });
});

describe('MedicalRecordAccessPolicy.canCreate', () => {
  it.each([
    [UserRole.SUPER_ADMIN, true],
    [UserRole.SERVICE_HEAD, false],
    [UserRole.INTERNAL_DOCTOR, true],
    [UserRole.EXTERNAL_DOCTOR, false],
    [UserRole.ADMISSION_AGENT, false],
    [UserRole.VERIFICATION_CLERK, false],
    [UserRole.RADIOLOGIST, false],
    [UserRole.LABORATORY_TECHNICIAN, false],
  ])('%s -> %s', async (role, expected) => {
    const policy = createPolicy({ patient: makePatient() });
    await expect(policy.canCreate(user(role), PATIENT_A)).resolves.toBe(
      expected,
    );
  });

  it('requires an internal doctor to be responsible for the patient', async () => {
    const assigned = createPolicy({ patient: makePatient([DOCTOR_A]) });
    const unassigned = createPolicy({ patient: makePatient([DOCTOR_B]) });

    await expect(
      assigned.canCreate(user(UserRole.INTERNAL_DOCTOR), PATIENT_A),
    ).resolves.toBe(true);
    await expect(
      unassigned.canCreate(user(UserRole.INTERNAL_DOCTOR), PATIENT_A),
    ).resolves.toBe(false);
  });

  it('returns false for a missing patient', async () => {
    const policy = createPolicy({ patient: null });
    await expect(
      policy.canCreate(user(UserRole.SUPER_ADMIN), PATIENT_A),
    ).resolves.toBe(false);
  });
});

describe('MedicalRecordAccessPolicy.canUpdate', () => {
  it.each([
    [UserRole.SUPER_ADMIN, true],
    [UserRole.SERVICE_HEAD, false],
    [UserRole.INTERNAL_DOCTOR, true],
    [UserRole.EXTERNAL_DOCTOR, false],
    [UserRole.ADMISSION_AGENT, false],
    [UserRole.VERIFICATION_CLERK, false],
    [UserRole.RADIOLOGIST, false],
    [UserRole.LABORATORY_TECHNICIAN, false],
  ])('%s -> %s', async (role, expected) => {
    const policy = createPolicy({ record: makeRecord() });
    await expect(policy.canUpdate(user(role), RECORD_A)).resolves.toBe(
      expected,
    );
  });

  it('allows only the authoring internal doctor to update', async () => {
    const author = createPolicy({ record: makeRecord() });
    const other = createPolicy({
      record: makeRecord({ authorId: DOCTOR_B }),
    });

    await expect(
      author.canUpdate(user(UserRole.INTERNAL_DOCTOR), RECORD_A),
    ).resolves.toBe(true);
    await expect(
      other.canUpdate(user(UserRole.INTERNAL_DOCTOR), RECORD_A),
    ).resolves.toBe(false);
  });

  it('returns false for a missing record', async () => {
    const policy = createPolicy({ record: null });
    await expect(
      policy.canUpdate(user(UserRole.SUPER_ADMIN), RECORD_A),
    ).resolves.toBe(false);
  });
});

describe('MedicalRecordAccessPolicy.canDelete', () => {
  it.each(ALL_ROLES)('%s', (role) => {
    const policy = createPolicy({});
    expect(policy.canDelete(user(role))).toBe(role === UserRole.SUPER_ADMIN);
  });
});

describe('MedicalRecordAccessPolicy listing helpers', () => {
  it.each([
    [UserRole.SUPER_ADMIN, true],
    [UserRole.SERVICE_HEAD, false],
    [UserRole.INTERNAL_DOCTOR, true],
    [UserRole.EXTERNAL_DOCTOR, false],
    [UserRole.ADMISSION_AGENT, false],
    [UserRole.VERIFICATION_CLERK, false],
    [UserRole.RADIOLOGIST, false],
    [UserRole.LABORATORY_TECHNICIAN, false],
  ])('canListRecords %s -> %s', (role, expected) => {
    const policy = createPolicy({});
    expect(policy.canListRecords(user(role))).toBe(expected);
  });

  it('limits doctor record views to the doctor or a super admin', () => {
    const policy = createPolicy({});

    expect(
      policy.canViewDoctorRecords(user(UserRole.INTERNAL_DOCTOR), DOCTOR_A),
    ).toBe(true);
    expect(
      policy.canViewDoctorRecords(user(UserRole.INTERNAL_DOCTOR), DOCTOR_B),
    ).toBe(false);
    expect(
      policy.canViewDoctorRecords(user(UserRole.SUPER_ADMIN), DOCTOR_B),
    ).toBe(true);
    expect(
      policy.canViewDoctorRecords(user(UserRole.SERVICE_HEAD), DOCTOR_A),
    ).toBe(false);
  });
});

describe('MedicalRecordAccessPolicy stopped policy rows', () => {
  it.todo(
    'SH supervised patient records: blocked until a supervised-patient relation exists',
  );
  it.todo(
    'RAD assigned imaging records: blocked until an imaging-assignment relation exists',
  );
  it.todo(
    'LAB assigned laboratory records: blocked until a lab-assignment relation exists',
  );

  it.each([UserRole.RADIOLOGIST, UserRole.LABORATORY_TECHNICIAN])(
    'currently denies %s record creation without an assignment relation',
    async (role) => {
      const policy = createPolicy({ patient: makePatient() });
      await expect(policy.canCreate(user(role), PATIENT_A)).resolves.toBe(
        false,
      );
    },
  );
});
