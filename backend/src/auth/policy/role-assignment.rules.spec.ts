import { UserRole } from '../../common/enums/user-role.enum';
import {
  canAssignRole,
  canAssignRoleName,
  getAssignableRoles,
  isUserRole,
  ROLE_ASSIGNMENT_RULES,
  RoleAssignmentActor,
  toUserRoles,
} from './role-assignment.rules';

const ALL_ROLES = Object.values(UserRole);

const EXPECTED_ASSIGNMENTS: Record<UserRole, readonly UserRole[]> = {
  [UserRole.SUPER_ADMIN]: [
    UserRole.SUPER_ADMIN,
    UserRole.SERVICE_HEAD,
    UserRole.INTERNAL_DOCTOR,
    UserRole.ADMISSION_AGENT,
    UserRole.VERIFICATION_CLERK,
    UserRole.RADIOLOGIST,
    UserRole.LABORATORY_TECHNICIAN,
  ],
  [UserRole.SERVICE_HEAD]: [
    UserRole.INTERNAL_DOCTOR,
    UserRole.RADIOLOGIST,
    UserRole.LABORATORY_TECHNICIAN,
  ],
  [UserRole.INTERNAL_DOCTOR]: [],
  [UserRole.EXTERNAL_DOCTOR]: [],
  [UserRole.ADMISSION_AGENT]: [],
  [UserRole.VERIFICATION_CLERK]: [],
  [UserRole.RADIOLOGIST]: [],
  [UserRole.LABORATORY_TECHNICIAN]: [],
};

const actor = (...roles: UserRole[]): RoleAssignmentActor => ({ roles });

describe('ROLE_ASSIGNMENT_RULES', () => {
  it('defines rules for every role', () => {
    expect(Object.keys(ROLE_ASSIGNMENT_RULES).sort()).toEqual(
      [...ALL_ROLES].sort(),
    );
  });

  it('matches the policy assignment matrix', () => {
    ALL_ROLES.forEach((actorRole) => {
      expect(ROLE_ASSIGNMENT_RULES[actorRole]).toEqual(
        EXPECTED_ASSIGNMENTS[actorRole],
      );
    });
  });
});

describe('canAssignRole', () => {
  describe.each(ALL_ROLES)('%s', (actorRole) => {
    it.each(ALL_ROLES)('target %s', (targetRole) => {
      const expected = EXPECTED_ASSIGNMENTS[actorRole].includes(targetRole);
      expect(canAssignRole(actor(actorRole), targetRole)).toBe(expected);
    });
  });

  it('never allows external_doctor to be assigned directly', () => {
    ALL_ROLES.forEach((actorRole) => {
      expect(canAssignRole(actor(actorRole), UserRole.EXTERNAL_DOCTOR)).toBe(
        false,
      );
    });
  });

  it('combines the permissions of multiple actor roles', () => {
    const combined = actor(UserRole.SERVICE_HEAD, UserRole.RADIOLOGIST);

    expect(canAssignRole(combined, UserRole.INTERNAL_DOCTOR)).toBe(true);
    expect(canAssignRole(combined, UserRole.LABORATORY_TECHNICIAN)).toBe(true);
    expect(canAssignRole(combined, UserRole.SUPER_ADMIN)).toBe(false);
  });

  it('denies an actor with no roles', () => {
    ALL_ROLES.forEach((targetRole) => {
      expect(canAssignRole(actor(), targetRole)).toBe(false);
    });
  });
});

describe('role assignment helpers', () => {
  it('recognises only known user roles', () => {
    ALL_ROLES.forEach((role) => expect(isUserRole(role)).toBe(true));
    expect(isUserRole('RADIOLOGIST')).toBe(false);
    expect(isUserRole('LAB_TECHNICIAN')).toBe(false);
    expect(isUserRole('')).toBe(false);
  });

  it('filters unknown values before evaluating assignments', () => {
    expect(toUserRoles(['super_admin', 'not_a_role'])).toEqual([
      UserRole.SUPER_ADMIN,
    ]);
    expect(
      canAssignRoleName(['super_admin', 'not_a_role'], UserRole.SUPER_ADMIN),
    ).toBe(true);
  });

  it('denies unknown target role names', () => {
    expect(canAssignRoleName(['super_admin'], 'RADIOLOGIST')).toBe(false);
    expect(canAssignRoleName(['super_admin'], 'not_a_role')).toBe(false);
  });

  it('returns the assignable roles for an actor', () => {
    expect(getAssignableRoles([UserRole.SERVICE_HEAD])).toEqual([
      UserRole.INTERNAL_DOCTOR,
      UserRole.RADIOLOGIST,
      UserRole.LABORATORY_TECHNICIAN,
    ]);
    expect(getAssignableRoles([UserRole.INTERNAL_DOCTOR])).toEqual([]);
    expect(getAssignableRoles([])).toEqual([]);
  });
});
