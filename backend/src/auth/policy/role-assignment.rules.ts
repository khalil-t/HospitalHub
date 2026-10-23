import { UserRole } from '../../common/enums/user-role.enum';

export type RoleAssignmentActor = {
  roles: readonly UserRole[];
};

export const ROLE_ASSIGNMENT_RULES: Readonly<
  Record<UserRole, readonly UserRole[]>
> = {
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

export function isUserRole(value: string): value is UserRole {
  return Object.values(UserRole).includes(value as UserRole);
}

export function toUserRoles(roles: readonly string[]): UserRole[] {
  return roles.filter(isUserRole);
}

export function canAssignRole(
  actor: RoleAssignmentActor,
  targetRole: UserRole,
): boolean {
  return actor.roles.some((role) =>
    ROLE_ASSIGNMENT_RULES[role]?.includes(targetRole),
  );
}

export function canAssignRoleName(
  actorRoles: readonly string[],
  targetRoleName: string,
): boolean {
  if (!isUserRole(targetRoleName)) {
    return false;
  }
  return canAssignRole({ roles: toUserRoles(actorRoles) }, targetRoleName);
}

export function getAssignableRoles(actorRoles: readonly string[]): UserRole[] {
  const actor: RoleAssignmentActor = { roles: toUserRoles(actorRoles) };
  return Object.values(UserRole).filter((role) => canAssignRole(actor, role));
}
