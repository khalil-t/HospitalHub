export interface AuthenticatedUser {
  id: string;
  username?: string;
  email?: string;
  roles: string[];
  serviceId?: string | null;
  fullName?: string;
}
