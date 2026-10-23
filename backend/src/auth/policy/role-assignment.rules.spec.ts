import { UserRole } from '../../common/enums/user-role.enum';
import {
  canAssignRole,
  ROLE_ASSIGNMENT_RULES,
  RoleAssignmentActor,
} from './role-assignment.rules';

const actor = (...roles: UserRole[]): RoleAssignmentActor => ({ roles });

describe('ROLE_ASSIGNMENT_RULES', () => {
  it('defines rules for every role', () => {
    expect(Object.keys(ROLE_ASSIGNMENT_RULES).sort()).toEqual(
      Object.values(UserRole).sort(),
    );
  });
});

describe('canAssignRole', () => {
  describe('super_admin', () => {
    const superAdmin = actor(UserRole.SUPER_ADMIN);

    it.each([
      UserRole.SUPER_ADMIN,
      UserRole.SERVICE_HEAD,
      UserRole.INTERNAL_DOCTOR,
      UserRole.ADMISSION_AGENT,
      UserRole.VERIFICATION_CLERK,
      UserRole.RADIOLOGIST,
      UserRole.LABORATORY_TECHNICIAN,
    ])('can assign %s', (targetRole) => {
      expect(canAssignRole(superAdmin, targetRole)).toBe(true);
    });

    it('cannot assign external_doctor outside the approval flow', () => {
      expect(canAssignRole(superAdmin, UserRole.EXTERNAL_DOCTOR)).toBe(false);
    });
  });

  describe('service_head', () => {
    const serviceHead = actor(UserRole.SERVICE_HEAD);

    it.each([
      UserRole.INTERNAL_DOCTOR,
      UserRole.RADIOLOGIST,
      UserRole.LABORATORY_TECHNICIAN,
    ])('can assign %s', (targetRole) => {
      expect(canAssignRole(serviceHead, targetRole)).toBe(true);
    });

    it.each([
      UserRole.SUPER_ADMIN,
      UserRole.SERVICE_HEAD,
      UserRole.EXTERNAL_DOCTOR,
      UserRole.ADMISSION_AGENT,
      UserRole.VERIFICATION_CLERK,
    ])('cannot assign %s', (targetRole) => {
      expect(canAssignRole(serviceHead, targetRole)).toBe(false);
    });
  });

  it.each([
    UserRole.INTERNAL_DOCTOR,
    UserRole.EXTERNAL_DOCTOR,
    UserRole.ADMISSION_AGENT,
    UserRole.VERIFICATION_CLERK,
    UserRole.RADIOLOGIST,
    UserRole.LABORATORY_TECHNICIAN,
  ])('%s cannot assign any role', (actorRole) => {
    const nonAdmin = actor(actorRole);

    Object.values(UserRole).forEach((targetRole) => {
      expect(canAssignRole(nonAdmin, targetRole)).toBe(false);
    });
  });

  it('combines the permissions of multiple actor roles', () => {
    const actorWithTwoRoles = actor(
      UserRole.SERVICE_HEAD,
      UserRole.INTERNAL_DOCTOR,
    );

    expect(
      canAssignRole(actorWithTwoRoles, UserRole.LABORATORY_TECHNICIAN),
    ).toBe(true);
  });

  it('denies an actor with no roles', () => {
    expect(canAssignRole(actor(), UserRole.INTERNAL_DOCTOR)).toBe(false);
  });
});
