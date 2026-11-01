import { USER_ROLE } from './roles';

export const getDefaultDashboard = (user) => {
  if (!user) return '/login';
  const roles = user.roles || [];

  if (user.isExternalDoctor || roles.includes(USER_ROLE.EXTERNAL_DOCTOR)) {
    return '/external';
  }
  if (roles.includes(USER_ROLE.SUPER_ADMIN)) {
    return '/admin-dashboard';
  }
  if (roles.includes(USER_ROLE.INTERNAL_DOCTOR)) {
    return '/doctor-dashboard';
  }
  if (roles.includes(USER_ROLE.SERVICE_HEAD)) {
    return '/admin-dashboard';
  }
  if (roles.includes(USER_ROLE.ADMISSION_AGENT)) {
    return '/AdmissionsOfficer-dashboard';
  }
  if (roles.includes(USER_ROLE.VERIFICATION_CLERK)) {
    return '/DPO-dashboard';
  }
  if (roles.includes(USER_ROLE.RADIOLOGIST)) {
    return '/Radiologist-dashboard';
  }
  if (roles.includes(USER_ROLE.LABORATORY_TECHNICIAN)) {
    return '/LaboratoryTechnician-dashboard';
  }

  return '/login';
};
