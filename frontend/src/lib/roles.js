export const USER_ROLE = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  SERVICE_HEAD: 'service_head',
  INTERNAL_DOCTOR: 'internal_doctor',
  EXTERNAL_DOCTOR: 'external_doctor',
  ADMISSION_AGENT: 'admission_agent',
  VERIFICATION_CLERK: 'verification_clerk',
  RADIOLOGIST: 'radiologist',
  LABORATORY_TECHNICIAN: 'laboratory_technician',
});

export const ROLE_ASSIGNMENT_RULES = Object.freeze({
  [USER_ROLE.SUPER_ADMIN]: Object.freeze([
    USER_ROLE.SUPER_ADMIN,
    USER_ROLE.SERVICE_HEAD,
    USER_ROLE.INTERNAL_DOCTOR,
    USER_ROLE.ADMISSION_AGENT,
    USER_ROLE.VERIFICATION_CLERK,
    USER_ROLE.RADIOLOGIST,
    USER_ROLE.LABORATORY_TECHNICIAN,
  ]),
  [USER_ROLE.SERVICE_HEAD]: Object.freeze([
    USER_ROLE.INTERNAL_DOCTOR,
    USER_ROLE.RADIOLOGIST,
    USER_ROLE.LABORATORY_TECHNICIAN,
  ]),
  [USER_ROLE.INTERNAL_DOCTOR]: Object.freeze([]),
  [USER_ROLE.EXTERNAL_DOCTOR]: Object.freeze([]),
  [USER_ROLE.ADMISSION_AGENT]: Object.freeze([]),
  [USER_ROLE.VERIFICATION_CLERK]: Object.freeze([]),
  [USER_ROLE.RADIOLOGIST]: Object.freeze([]),
  [USER_ROLE.LABORATORY_TECHNICIAN]: Object.freeze([]),
});

export const getAssignableRoles = (actorRoles = []) => {
  const assignable = new Set();

  actorRoles.forEach((actorRole) => {
    (ROLE_ASSIGNMENT_RULES[actorRole] || []).forEach((role) => {
      assignable.add(role);
    });
  });

  return Object.values(USER_ROLE).filter((role) => assignable.has(role));
};

export const canAssignRole = (actorRoles = [], targetRole) =>
  getAssignableRoles(actorRoles).includes(targetRole);

export const hasRole = (roles = [], role) => roles.includes(role);

export const isSuperAdmin = (roles = []) =>
  hasRole(roles, USER_ROLE.SUPER_ADMIN);

export const isServiceHead = (roles = []) =>
  hasRole(roles, USER_ROLE.SERVICE_HEAD);

export const canManageUsers = (roles = []) =>
  isSuperAdmin(roles) || isServiceHead(roles);
