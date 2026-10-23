import { useState, useEffect } from 'react';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
import { Textarea } from '@/components/ui/textarea';
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
  Plus,
  Stethoscope,
} from 'lucide-react';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useNavigate } from 'react-router-dom';
import ExternalDoctorManagement from './ExternalDoctorManagement';
import { adminService, roleService } from '@/services/service';

const AdminDashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [newRoleForm, setNewRoleForm] = useState({ name: '', description: '' });
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
  const [services, setServices] = useState([]);
  const navigate = useNavigate();

  const loadRoles = async () => {
    try {
      const data = await roleService.getAllRoles();
      setRoles(data);
    } catch (error) {
      toast.error(error.message || 'Failed to load roles');
    }
  };

  const loadServices = async () => {
    try {
      const data = await adminService.getServices();
      setServices(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error.message || 'Failed to load services');
    }
  };

  const loadUsers = async () => {
    try {
      const data = await adminService.getUsers();
      setUsers(Array.isArray(data) ? data : data.users || []);
    } catch (error) {
      toast.error(error.message || 'Failed to load users');
    }
  };

  useEffect(() => {
    const initializeDashboard = async () => {
      await loadRoles();
      await loadServices();
      await loadUsers();
    };

    initializeDashboard();
  }, []);

  const handleCreateRole = async (event) => {
    event.preventDefault();

    if (!newRoleForm.name.trim()) {
      toast.error('Role name is required');
      return;
    }

    try {
      await roleService.createRole({
        name: newRoleForm.name.trim(),
        description:
          newRoleForm.description.trim() || `${newRoleForm.name} role`,
      });

      toast.success('Role created successfully!');
      await loadRoles();
      setNewRoleForm({ name: '', description: '' });
      setIsCreateRoleModalOpen(false);
    } catch (error) {
      toast.error(error.message || 'Something went wrong');
    }
  };

  const deleteRole = async (roleId) => {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this role?\n\n' +
        'This action cannot be undone and will remove the role from all users.',
    );

    if (!confirmDelete) {
      return;
    }

    try {
      await roleService.deleteRole(roleId);
      setRoles(roles.filter((role) => role.id !== roleId));
      toast.success('Role deleted successfully');
    } catch (error) {
      if (error.status === 404) {
        toast.error('Role not found or already deleted');
      } else if (error.status === 409) {
        toast.error(error.message || "Cannot delete role - it's still assigned to users");
      } else {
        toast.error(error.message || 'Something went wrong');
      }
    }
  };

  const handleUserSubmit = async (event) => {
    event.preventDefault();

    if (
      !userForm.fullName ||
      !userForm.email ||
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

      await (editingItem
        ? adminService.updateUser(editingItem.id, payload)
        : adminService.createUser(payload));

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
        serviceId: '',
      });
    }

    setIsUserModalOpen(true);
  };

  const openRoleModal = (user) => {
    setSelectedUser(user);
    setSelectedRole(user.roles?.[0]?.id || '');
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
      await adminService.deleteUser(id);
      setUsers(users.filter((user) => user.id !== id));
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
                System Administrator
              </p>
            </div>
            <ThemeToggle />
            <Button
              onClick={() => navigate('/login')}
              variant="outline"
              className="border-border/50 bg-card/50 backdrop-blur-sm hover:bg-secondary/50 transition-all duration-200"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                +{users.filter((u) => u.status === 'Active').length} active
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold text-foreground/80">
                Active Roles
              </CardTitle>
              <div className="p-2 bg-blue-500/10 rounded-lg group-hover:scale-110 transition-transform">
                <Shield className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-500 mb-1">
                {roles.length}
              </div>
              <p className="text-xs text-muted-foreground">System roles</p>
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
                {services.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Hospital services
              </p>
            </CardContent>
          </Card>

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
            <TabsTrigger
              value="roles"
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg transition-all duration-200"
            >
              <Shield className="mr-2 h-4 w-4" />
              Roles
            </TabsTrigger>
            <TabsTrigger
              value="services"
              className="data-[state=active]:bg-green-500 data-[state=active]:text-white rounded-lg transition-all duration-200"
            >
              <Stethoscope className="mr-2 h-4 w-4" />
              Services
            </TabsTrigger>
            <TabsTrigger
              value="requests"
              className="data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-lg transition-all duration-200"
            >
              <Clock className="mr-2 h-4 w-4" />
              Requests
            </TabsTrigger>
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
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-background/50 hover:bg-secondary/30 transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-3 rounded-lg ${
                            user.status === 'Active'
                              ? 'bg-green-500/10 text-green-500'
                              : 'bg-gray-400/10 text-gray-500'
                          }`}
                        >
                          {getStatusIcon(user.status)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {user.fullName}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge
                          className={`px-3 py-1 ${
                            user.role === 'Admin'
                              ? 'bg-red-500/20 text-red-500 border-red-500/20'
                              : user.role === 'Moderator'
                                ? 'bg-blue-500/20 text-blue-500 border-blue-500/20'
                                : 'bg-green-500/20 text-green-500 border-green-500/20'
                          }`}
                        >
                          {user.role}
                        </Badge>
                        <div className="flex items-center gap-2">
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
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="space-y-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold text-foreground">
                      Roles Management
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Create and manage system roles
                    </CardDescription>
                  </div>
                  <Button
                    className="bg-blue-500 text-white"
                    onClick={() => setIsCreateRoleModalOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Role
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
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
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteRole(role.id)}
                              className="text-red-500 hover:bg-red-100 h-8 w-8"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            {role.description || `${role.name} role permissions`}
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
                            {user.email}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openRoleModal(user)}
                          className="text-primary hover:bg-primary/10"
                        >
                          + Add Role
                        </Button>
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
                                <button
                                  onClick={() =>
                                    removeRoleFromUser(user.id, role.id)
                                  }
                                  className="ml-1 hover:text-red-500 transition-colors"
                                  title="Remove role"
                                >
                                  <X className="h-4 w-4" />
                                </button>
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

          <TabsContent value="services" className="space-y-6">
            <ServicesManagement />
          </TabsContent>

          <TabsContent value="requests" className="space-y-6">
            <ExternalDoctorManagement />
          </TabsContent>
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
                required
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
                required
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
                required
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
                  {services.map((service) => (
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
                    {services.find((s) => s.id === userForm.serviceId)?.name}
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
                tab to assign specific roles like DOCTOR, ....etc.
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

      <Dialog open={isCreateRoleModalOpen} onOpenChange={setIsCreateRoleModalOpen}>
        <DialogContent className="bg-background border-border/50">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>
              Create a new system role with specific permissions
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRole} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="roleName">Role Name *</Label>
              <Input
                id="roleName"
                value={newRoleForm.name}
                onChange={(e) =>
                  setNewRoleForm({ ...newRoleForm, name: e.target.value })
                }
                placeholder="e.g., NURSE, PHARMACIST, TECHNICIAN"
                required
              />
              <p className="text-xs text-muted-foreground">
                Use UPPERCASE format (e.g., DOCTOR, ADMIN, NURSE)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="roleDescription">Description</Label>
              <Textarea
                id="roleDescription"
                value={newRoleForm.description}
                onChange={(e) =>
                  setNewRoleForm({
                    ...newRoleForm,
                    description: e.target.value,
                  })
                }
                placeholder="Describe the role and its responsibilities"
                rows={3}
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Tip:</strong> Available roles include: super_admin,
                internal_doctor, service_head, admission_agent,
                verification_clerk, RADIOLOGIST, LAB_TECHNICIAN
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateRoleModalOpen(false);
                  setNewRoleForm({ name: '', description: '' });
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-500 text-white">
                <Save className="mr-2 h-4 w-4" />
                Create Role
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
        <DialogContent className="bg-background border-border/50 max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedUser ? `Assign Role to ${selectedUser.fullName}` : 'Assign Role'}
            </DialogTitle>
            <DialogDescription>
              Select a role for the user from the list below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {roles.map((role) => (
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
