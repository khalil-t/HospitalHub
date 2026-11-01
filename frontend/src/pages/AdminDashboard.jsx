import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import ServicesManagement from './ServicesManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Users,
  Shield,
  Clock,
  Search,
  UserPlus,
  Trash2,
  Edit,
  LogOut,
  TrendingUp,
  Filter,
  ChevronRight,
  CheckCircle,
  XCircle,
  Save,
  X,
  Stethoscope,
} from 'lucide-react';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useNavigate } from 'react-router-dom';
import ExternalDoctorManagement from './ExternalDoctorManagement';
import { adminService, roleService, userService } from '@/services/service';
import { useAuth } from '@/contexts/useAuth';
import {
  USER_ROLE,
  canAssignRole,
  canManageUsers,
  isServiceHead,
  isSuperAdmin,
} from '@/lib/roles';

const AdminDashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [userForm, setUserForm] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    phoneNumber: '',
    serviceId: '',
  });
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [assignableRoles, setAssignableRoles] = useState([]);
  const [services, setServices] = useState([]);
  const navigate = useNavigate();
  const { user: currentUser, logout } = useAuth();

  const currentRoles = currentUser?.roles || [];
  const currentUserId = currentUser?.id;
  const currentIsSuperAdmin = isSuperAdmin(currentRoles);
  const currentIsServiceHead = isServiceHead(currentRoles);
  const currentCanManageUsers = canManageUsers(currentRoles);

  const loadRoles = useCallback(async () => {
    if (!currentIsSuperAdmin) {
      setRoles([]);
      return;
    }

    try {
      const data = await roleService.getAllRoles();
      setRoles(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error.message || 'Failed to load roles');
    }
  }, [currentIsSuperAdmin]);

  const loadAssignableRoles = useCallback(async () => {
    if (!currentCanManageUsers) {
      return;
    }

    try {
      const data = await userService.getAssignableRoles();
      setAssignableRoles(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error.message || 'Failed to load assignable roles');
    }
  }, [currentCanManageUsers]);

  const loadServices = useCallback(async () => {
    try {
      const data = await adminService.getServices();
      setServices(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error.message || 'Failed to load services');
    }
  }, []);

  const loadUsers = useCallback(async () => {
    if (!currentCanManageUsers) {
      return;
    }

    try {
      const data = await userService.getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error.message || 'Failed to load users');
    }
  }, [currentCanManageUsers]);

  useEffect(() => {
    if (!currentCanManageUsers) {
      return;
    }

    const initializeDashboard = async () => {
      await loadRoles();
      await loadAssignableRoles();
      await loadServices();
      await loadUsers();
    };

    initializeDashboard();
  }, [
    currentCanManageUsers,
    loadAssignableRoles,
    loadRoles,
    loadServices,
    loadUsers,
  ]);

  const handleUserSubmit = async (event) => {
    event.preventDefault();

    if (
      !userForm.fullName ||
      (!editingItem && (!userForm.username || !userForm.email)) ||
      (!editingItem && !userForm.password)
    ) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const payload = {};
      if (userForm.fullName) payload.fullName = userForm.fullName;
      if (userForm.username) payload.username = userForm.username;
      if (userForm.email) payload.email = userForm.email;
      if (!editingItem && userForm.password) {
        payload.password = String(userForm.password.trim());
      }
      if (userForm.serviceId) payload.serviceId = userForm.serviceId;
      if (userForm.phoneNumber) payload.phoneNumber = userForm.phoneNumber;

      if (editingItem) {
        await userService.updateUser(editingItem.id, payload);
      } else if (currentIsSuperAdmin) {
        await adminService.createUser(payload);
      } else {
        await userService.createUser(payload);
      }

      toast.success(
        editingItem ? 'User updated successfully' : 'User added successfully',
      );

      await loadUsers();
      closeModals();
    } catch (error) {
      toast.error(error.message || 'Something went wrong');
    }
  };

  const openUserModal = (user = null) => {
    setEditingItem(user);

    if (user) {
      setUserForm({
        fullName: user.fullName || '',
        username: user.username || '',
        email: user.email || '',
        password: '',
        phoneNumber: '',
        serviceId: user.service?.id || '',
      });
    } else {
      setUserForm({
        fullName: '',
        username: '',
        email: '',
        password: '',
        phoneNumber: '',
        serviceId: currentIsServiceHead ? currentUser?.service?.id || '' : '',
      });
    }

    setIsUserModalOpen(true);
  };

  const openRoleModal = (user) => {
    setSelectedUser(user);
    setSelectedRole('');
    setIsRoleModalOpen(true);
  };

  const closeModals = () => {
    setIsUserModalOpen(false);
    setIsRoleModalOpen(false);
    setEditingItem(null);
  };

  const handleChangeRole = async () => {
    if (!selectedUser || !selectedRole) {
      toast.error('Please select a role');
      return;
    }

    try {
      const updatedUser = await roleService.assignRole(
        selectedUser.id,
        selectedRole,
      );

      setUsers((prev) =>
        prev.map((user) => (user.id === updatedUser.id ? updatedUser : user)),
      );

      toast.success('Role updated successfully!');
      setSelectedUser(null);
      setSelectedRole('');
      setIsRoleModalOpen(false);
    } catch (error) {
      toast.error(error.message || 'Error updating role');
    }
  };

  const deleteUser = async (id) => {
    try {
      await userService.deleteUser(id);
      await loadUsers();
      toast.success('User deleted successfully');
    } catch (error) {
      toast.error(error.message || 'Something went wrong');
    }
  };

  const removeRoleFromUser = async (userId, roleId) => {
    try {
      const updatedUser = await roleService.removeRole(userId, roleId);

      setUsers((prev) =>
        prev.map((user) => (user.id === updatedUser.id ? updatedUser : user)),
      );

      toast.success('Role removed successfully!');
    } catch (error) {
      toast.error(error.message || 'Error removing role');
    }
  };

  const targetHasSuperAdmin = (target) =>
    (target.roles || []).some((role) => role.name === USER_ROLE.SUPER_ADMIN);

  const canManageTargetUser = (target) =>
    Boolean(target?.id) &&
    target.id !== currentUserId &&
    (currentIsSuperAdmin || !targetHasSuperAdmin(target));

  const canModifyTargetRoles = (target) =>
    currentCanManageUsers &&
    canManageTargetUser(target) &&
    (currentIsSuperAdmin || !targetHasSuperAdmin(target));

  const availableRolesForSelectedUser = assignableRoles.filter(
    (role) =>
      !(selectedUser?.roles || []).some(
        (assignedRole) => assignedRole.id === role.id,
      ),
  );

  const visibleServices = currentIsSuperAdmin
    ? services
    : services.filter((service) => service.id === currentUser?.service?.id);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Active':
      case 'Success':
        return <CheckCircle className="h-4 w-4" />;
      case 'Inactive':
      case 'Denied':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (!currentCanManageUsers) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-6">
        <Card className="w-full max-w-md border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Access denied</CardTitle>
            <CardDescription>
              You do not have permission to access user management.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => navigate('/login')}>
              Back to login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Stethoscope className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                  MediSecure
                </h1>
                <p className="text-muted-foreground font-medium text-sm md:text-base">
                  Admin Management Portal
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-semibold text-foreground">Admin User</p>
              <p className="text-sm text-muted-foreground">
                {currentIsSuperAdmin ? 'System Administrator' : 'Service Head'}
              </p>
            </div>
            <ThemeToggle />
            <Button
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              variant="outline"
              className="border-border/50 bg-card/50 backdrop-blur-sm hover:bg-secondary/50 transition-all duration-200"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        <div
          className={`grid grid-cols-1 gap-6 ${
            currentIsSuperAdmin ? 'md:grid-cols-4' : 'md:grid-cols-3'
          }`}
        >
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold text-foreground/80">
                Total Users
              </CardTitle>
              <div className="p-2 bg-primary/10 rounded-lg group-hover:scale-110 transition-transform">
                <Users className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary mb-1">
                {users.length}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 text-green-500" />
                {currentIsSuperAdmin
                  ? `+${users.filter((u) => u.isActive !== false).length} active`
                  : 'Own service'}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold text-foreground/80">
                {currentIsSuperAdmin ? 'Active Roles' : 'Assignable Roles'}
              </CardTitle>
              <div className="p-2 bg-blue-500/10 rounded-lg group-hover:scale-110 transition-transform">
                <Shield className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-500 mb-1">
                {currentIsSuperAdmin ? roles.length : assignableRoles.length}
              </div>
              <p className="text-xs text-muted-foreground">
                {currentIsSuperAdmin ? 'System roles' : 'Roles you can assign'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold text-foreground/80">
                Services
              </CardTitle>
              <div className="p-2 bg-green-500/10 rounded-lg group-hover:scale-110 transition-transform">
                <Stethoscope className="h-4 w-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500 mb-1">
                {currentIsSuperAdmin ? services.length : visibleServices.length}
              </div>
              <p className="text-xs text-muted-foreground">
                {currentIsSuperAdmin ? 'Hospital services' : 'Your service'}
              </p>
            </CardContent>
          </Card>

          {currentIsSuperAdmin && (
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 group">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-semibold text-foreground/80">
                  Pending Requests
                </CardTitle>
                <div className="p-2 bg-purple-500/10 rounded-lg group-hover:scale-110 transition-transform">
                  <Clock className="h-4 w-4 text-purple-500" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Awaiting review</p>
              </CardContent>
            </Card>
          )}
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="bg-secondary/30 backdrop-blur-sm border border-border/50 p-1 rounded-xl">
            <TabsTrigger
              value="users"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg transition-all duration-200"
            >
              <Users className="mr-2 h-4 w-4" />
              Users
            </TabsTrigger>
            {currentIsSuperAdmin && (
              <TabsTrigger
                value="roles"
                className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg transition-all duration-200"
              >
                <Shield className="mr-2 h-4 w-4" />
                Roles
              </TabsTrigger>
            )}
            {currentIsSuperAdmin && (
              <TabsTrigger
                value="services"
                className="data-[state=active]:bg-green-500 data-[state=active]:text-white rounded-lg transition-all duration-200"
              >
                <Stethoscope className="mr-2 h-4 w-4" />
                Services
              </TabsTrigger>
            )}
            {currentIsSuperAdmin && (
              <TabsTrigger
                value="requests"
                className="data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-lg transition-all duration-200"
              >
                <Clock className="mr-2 h-4 w-4" />
                Requests
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold text-foreground">
                      Users Management
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Manage user accounts and permissions
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-background border-border/50 text-foreground w-64"
                      />
                    </div>
                    <Button variant="outline" className="border-border/50">
                      <Filter className="mr-2 h-4 w-4" />
                      Filter
                    </Button>
                    <Button
                      className="bg-primary text-primary-foreground"
                      onClick={() => openUserModal()}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add User
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((user) => {
                    const roleNames = (user.roles || []).map(
                      (role) => role.name,
                    );
                    const displayRole = roleNames.join(', ') || 'No role';
                    const targetIsSuperAdmin = roleNames.includes(
                      USER_ROLE.SUPER_ADMIN,
                    );

                    return (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-background/50 hover:bg-secondary/30 transition-all duration-200 group"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`p-3 rounded-lg ${
                              user.isActive === false
                                ? 'bg-gray-400/10 text-gray-500'
                                : 'bg-green-500/10 text-green-500'
                            }`}
                          >
                            {getStatusIcon(
                              user.isActive === false ? 'Inactive' : 'Active',
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">
                              {user.fullName}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {user.email ||
                                user.service?.name ||
                                'No service assigned'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge
                            className={`px-3 py-1 ${
                              targetIsSuperAdmin
                                ? 'bg-red-500/20 text-red-500 border-red-500/20'
                                : 'bg-green-500/20 text-green-500 border-green-500/20'
                            }`}
                          >
                            {displayRole}
                          </Badge>
                          <div className="flex items-center gap-2">
                            {canManageTargetUser(user) && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="rounded-lg hover:bg-secondary"
                                  onClick={() => openUserModal(user)}
                                >
                                  <Edit className="h-4 w-4 text-primary" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="rounded-lg hover:bg-red-100"
                                  onClick={() => deleteUser(user.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </>
                            )}
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {currentIsSuperAdmin && (
            <TabsContent value="roles" className="space-y-6">
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl font-bold text-foreground">
                        {currentIsSuperAdmin
                          ? 'Roles Management'
                          : 'Role Assignments'}
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        {currentIsSuperAdmin
                          ? 'Manage system roles'
                          : 'Assign roles to users in your service'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {currentIsSuperAdmin && (
                    <div className="space-y-4 mb-8">
                      <h3 className="text-lg font-semibold text-foreground mb-4">
                        System Roles
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {roles.map((role) => (
                          <Card
                            key={role.id}
                            className="border-border/50 bg-background/50"
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-semibold">
                                  {role.name}
                                </CardTitle>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-muted-foreground">
                                {role.description ||
                                  `${role.name} role permissions`}
                              </p>
                              <div className="mt-3">
                                <Badge variant="outline" className="text-xs">
                                  {
                                    users.filter((user) =>
                                      user.roles?.some((r) => r.id === role.id),
                                    ).length
                                  }{' '}
                                  users
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground mb-4">
                      User Role Assignments
                    </h3>
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className="p-4 rounded-lg border border-border/50 bg-background/50 hover:bg-secondary/30 transition-all duration-200"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-foreground">
                              {user.fullName}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {user.email ||
                                user.service?.name ||
                                'No service assigned'}
                            </p>
                          </div>
                          {canModifyTargetRoles(user) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openRoleModal(user)}
                              className="text-primary hover:bg-primary/10"
                            >
                              + Add Role
                            </Button>
                          )}
                        </div>

                        {user.roles && user.roles.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase">
                              Assigned Roles
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {user.roles.map((role) => (
                                <div
                                  key={role.id}
                                  className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full border border-primary/20"
                                >
                                  <span className="text-sm font-medium">
                                    {role.name}
                                  </span>
                                  {canModifyTargetRoles(user) &&
                                    canAssignRole(currentRoles, role.name) && (
                                      <button
                                        onClick={() =>
                                          removeRoleFromUser(user.id, role.id)
                                        }
                                        className="ml-1 hover:text-red-500 transition-colors"
                                        title="Remove role"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground italic">
                            No roles assigned
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {currentIsSuperAdmin && (
            <TabsContent value="services" className="space-y-6">
              <ServicesManagement />
            </TabsContent>
          )}

          {currentIsSuperAdmin && (
            <TabsContent value="requests" className="space-y-6">
              <ExternalDoctorManagement />
            </TabsContent>
          )}
        </Tabs>
      </div>

      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent className="bg-background border-border/50 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit User' : 'Add New User'}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? 'Update user information'
                : 'Create a new user account'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUserSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={userForm.fullName}
                onChange={(e) =>
                  setUserForm({ ...userForm, fullName: e.target.value })
                }
                placeholder="Enter full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={userForm.username}
                onChange={(e) =>
                  setUserForm({ ...userForm, username: e.target.value })
                }
                placeholder="Enter username"
                required={!editingItem}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                value={userForm.phoneNumber}
                onChange={(e) =>
                  setUserForm({ ...userForm, phoneNumber: e.target.value })
                }
                placeholder="Enter Phone Number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={userForm.email}
                onChange={(e) =>
                  setUserForm({ ...userForm, email: e.target.value })
                }
                placeholder="Enter email address"
                required={!editingItem}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={userForm.password}
                onChange={(e) =>
                  setUserForm({ ...userForm, password: e.target.value })
                }
                placeholder="Enter password"
                required={!editingItem}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceId">Service Assignment *</Label>
              <Select
                value={userForm.serviceId || ''}
                onValueChange={(value) =>
                  setUserForm({ ...userForm, serviceId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select service department" />
                </SelectTrigger>
                <SelectContent>
                  {visibleServices.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      <div className="flex items-center gap-2">
                        <span>{service.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {service.description || 'Medical Service'}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Assign user to a specific service department. Roles will be
                assigned later.
              </p>
            </div>

            {userForm.serviceId && (
              <div className="bg-secondary/30 rounded-lg p-3 border border-border/50">
                <h4 className="text-sm font-medium text-foreground mb-2">
                  Service Assignment:
                </h4>
                <div className="flex items-center gap-3">
                  <Badge className="bg-blue-500/20 text-blue-600">
                    {
                      visibleServices.find((s) => s.id === userForm.serviceId)
                        ?.name
                    }
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  User will be assigned to this service department. Use the
                  Roles tab to assign specific roles later.
                </p>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> After creating the user, go to the Roles
                tab to assign roles you are allowed to delegate.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModals}>
                Cancel
              </Button>
              <Button type="submit">
                <Save className="mr-2 h-4 w-4" />
                {editingItem ? 'Update User' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
        <DialogContent className="bg-background border-border/50 max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedUser
                ? `Assign Role to ${selectedUser.fullName}`
                : 'Assign Role'}
            </DialogTitle>
            <DialogDescription>
              Select a role you are allowed to delegate to this user.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableRolesForSelectedUser.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No additional roles are available for this user.
                </p>
              )}
              {availableRolesForSelectedUser.map((role) => (
                <div key={role.id} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id={`role-${role.id}`}
                    name="userRole"
                    value={role.id}
                    checked={selectedRole === role.id}
                    onChange={() => setSelectedRole(role.id)}
                    className="peer"
                  />
                  <label
                    htmlFor={`role-${role.id}`}
                    className="text-sm font-medium cursor-pointer peer-checked:text-primary"
                  >
                    {role.name}
                  </label>
                </div>
              ))}
            </div>

            <DialogFooter className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeModals}>
                Cancel
              </Button>
              <Button
                onClick={handleChangeRole}
                className="bg-primary text-white"
                disabled={!selectedRole}
              >
                Save
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
