import { Patient } from './entities/patient.entity';
import { toPatientDetail, toPatientListItem } from './patient-response.mapper';

const PATIENT = {
  id: '00000000-0000-4000-8000-000000000101',
  firstName: 'Fake',
  lastName: 'Patient',
  dob: new Date('1990-01-01T00:00:00.000Z'),
  gender: 'F',
  phoneNumber: '+10000000000',
  nationalNumber: 'FAKE-NATIONAL-0001',
  insuranceNumber: 'FAKE-INSURANCE-0001',
  services: [
    {
      id: '00000000-0000-4000-8000-00000000000a',
      code: 'P8A',
      name: 'Fake Service A',
      description: 'Should not be exposed',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      users: [{ id: '00000000-0000-4000-8000-000000000201' }],
      patients: [],
    },
  ],
  createdBy: {
    id: '00000000-0000-4000-8000-000000000201',
    username: 'fake.user',
    hashedPassword: 'not-a-real-hash',
  },
  medicalRecords: [{ id: '00000000-0000-4000-8000-000000000301' }],
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
} as unknown as Patient;

describe('toPatientListItem', () => {
  it('returns only id, first name and last name', () => {
    const result = toPatientListItem(PATIENT);

    expect(result).toEqual({
      id: PATIENT.id,
      firstName: 'Fake',
      lastName: 'Patient',
    });
    expect(Object.keys(result).sort()).toEqual(['firstName', 'id', 'lastName']);
  });

  it('does not leak demographics, services, creator or records', () => {
    const result = toPatientListItem(PATIENT);
    const keys = Object.keys(result);

    [
      'phoneNumber',
      'dob',
      'gender',
      'nationalNumber',
      'insuranceNumber',
      'services',
      'createdBy',
      'medicalRecords',
    ].forEach((key) => expect(keys).not.toContain(key));
  });
});

describe('toPatientDetail', () => {
  it('returns only the approved detail fields', () => {
    const result = toPatientDetail(PATIENT);

    expect(Object.keys(result).sort()).toEqual([
      'dob',
      'firstName',
      'gender',
      'id',
      'insuranceNumber',
      'lastName',
      'nationalNumber',
      'phoneNumber',
      'services',
    ]);
  });

  it('maps services to id, code and name only', () => {
    const result = toPatientDetail(PATIENT);

    expect(result.services).toEqual([
      {
        id: '00000000-0000-4000-8000-00000000000a',
        code: 'P8A',
        name: 'Fake Service A',
      },
    ]);
    expect(Object.keys(result.services[0]).sort()).toEqual([
      'code',
      'id',
      'name',
    ]);
  });

  it('does not leak the creator, records or internal fields', () => {
    const result = toPatientDetail(PATIENT);
    const keys = Object.keys(result);

    ['createdBy', 'medicalRecords', 'createdAt'].forEach((key) =>
      expect(keys).not.toContain(key),
    );
  });

  it('normalises missing optional values to null', () => {
    const minimal = {
      id: PATIENT.id,
      firstName: 'Fake',
      lastName: 'Patient',
    } as Patient;

    const result = toPatientDetail(minimal);

    expect(result.dob).toBeNull();
    expect(result.gender).toBeNull();
    expect(result.phoneNumber).toBeNull();
    expect(result.nationalNumber).toBeNull();
    expect(result.insuranceNumber).toBeNull();
    expect(result.services).toEqual([]);
  });
});
