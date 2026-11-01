import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  RefreshCw,
  Filter,
  Calendar,
  AlertTriangle,
  Shield,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { auditService } from "@/services/auditService";

const ACTION_COLORS = {
  LOGIN: "bg-green-100 text-green-800",
  LOGOUT: "bg-gray-100 text-gray-800",
  PATIENT_CREATED: "bg-blue-100 text-blue-800",
  PATIENT_UPDATED: "bg-yellow-100 text-yellow-800",
  PATIENT_DELETED: "bg-red-100 text-red-800",
  RECORD_VIEWED: "bg-indigo-100 text-indigo-800",
  RECORD_CREATED: "bg-green-100 text-green-800",
  RECORD_UPDATED: "bg-yellow-100 text-yellow-800",
  RECORD_DELETED: "bg-red-100 text-red-800",
  SEARCH_PERFORMED: "bg-purple-100 text-purple-800",
  DASHBOARD_ACCESSED: "bg-cyan-100 text-cyan-800",
  PAGE_VISITED: "bg-teal-100 text-teal-800",
  EXTERNAL_DOCTOR_REQUEST: "bg-orange-100 text-orange-800",
  UI_INTERACTION: "bg-pink-100 text-pink-800",
  FORM_RESET: "bg-gray-100 text-gray-800",
  NAVIGATION: "bg-lime-100 text-lime-800",
};

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? "Invalid Date" : date.toLocaleString();
};

const getActionBadge = (action) => (
  <Badge className={ACTION_COLORS[action] || "bg-gray-100 text-gray-800"}>
    {action || "UNKNOWN"}
  </Badge>
);

const DPODashboard = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dashboardStats, setDashboardStats] = useState({
    todayLogs: 0,
    weekLogs: 0,
    failedLogins: 0,
    totalLogs: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    action: "",
    resource: "",
    startDate: "",
    endDate: "",
  });

  const fetchLogs = async (page = 1, showToast = false) => {
    setIsLoading(true);
    try {
      const response = await auditService.fetchLogs(page, 50, filters);

      if (response && response.data) {
        setLogs(response.data);
        setFilteredLogs(response.data);
        setTotalPages(Math.ceil(response.total / 50));

        if (showToast) {
          toast.success(`Loaded ${response.data.length} audit logs`);
        }
      } else {
        setLogs([]);
        setFilteredLogs([]);
      }
    } catch (error) {
      toast.error(`Failed to load audit logs: ${error.message}`);
      setLogs([]);
      setFilteredLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const stats = await auditService.fetchDashboardStats();
      setDashboardStats(stats);
    } catch {
      toast.error("Failed to load dashboard statistics");
    }
  };

  const refreshData = async () => {
    await Promise.all([fetchLogs(currentPage, true), fetchDashboardStats()]);
  };

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    fetchLogs(currentPage, filters);
  }, [currentPage, filters]);

  const handleSearch = (searchValue) => {
    setSearchTerm(searchValue);

    if (!searchValue.trim()) {
      setFilteredLogs(logs);
      return;
    }

    const term = searchValue.toLowerCase();
    const filtered = logs.filter(
      (log) =>
        log.action?.toLowerCase().includes(term) ||
        log.resource?.toLowerCase().includes(term) ||
        log.details?.toLowerCase().includes(term) ||
        log.user?.username?.toLowerCase().includes(term) ||
        log.user?.email?.toLowerCase().includes(term),
    );

    setFilteredLogs(filtered);
  };

  const applyFilters = async () => {
    setCurrentPage(1);
    await fetchLogs(1, true);
  };

  const clearFilters = async () => {
    setFilters({
      action: "",
      resource: "",
      startDate: "",
      endDate: "",
    });
    setSearchTerm("");
    setCurrentPage(1);
    await fetchLogs(1, true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-blue-50/20 dark:to-blue-950/20 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Shield className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                  DPO Dashboard
                </h1>
                <p className="text-muted-foreground font-medium text-sm md:text-base">
                  Data Protection &amp; Audit Logging System
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={refreshData}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Today&apos;s Logs
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardStats.todayLogs}
              </div>
              <p className="text-xs text-muted-foreground">Activities today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Week&apos;s Logs
              </CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardStats.weekLogs}
              </div>
              <p className="text-xs text-muted-foreground">This week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Failed Logins
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {dashboardStats.failedLogins}
              </div>
              <p className="text-xs text-muted-foreground">Security alerts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardStats.totalLogs}
              </div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Audit Logs</CardTitle>
            <CardDescription>
              Monitor all system activities and user interactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search logs by action, user, or details..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <select
                  value={filters.action}
                  onChange={(e) =>
                    setFilters({ ...filters, action: e.target.value })
                  }
                  className="px-3 py-2 border border-input rounded-md text-sm"
                >
                  <option value="">All Actions</option>
                  <option value="LOGIN">Login</option>
                  <option value="LOGOUT">Logout</option>
                  <option value="PATIENT_CREATED">Patient Created</option>
                  <option value="RECORD_VIEWED">Record Viewed</option>
                  <option value="SEARCH_PERFORMED">Search</option>
                </select>

                <select
                  value={filters.resource}
                  onChange={(e) =>
                    setFilters({ ...filters, resource: e.target.value })
                  }
                  className="px-3 py-2 border border-input rounded-md text-sm"
                >
                  <option value="">All Resources</option>
                  <option value="patient">Patient</option>
                  <option value="medical_record">Medical Record</option>
                  <option value="user">User</option>
                  <option value="authentication">Authentication</option>
                </select>

                <Button onClick={applyFilters} size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  Apply
                </Button>

                <Button onClick={clearFilters} variant="outline" size="sm">
                  Clear
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-2">Loading audit logs...</span>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {searchTerm
                    ? "No logs found matching your search"
                    : "No audit logs found"}
                </p>
                <div className="flex gap-2 justify-center mt-4">
                  <Button onClick={() => fetchLogs(1, true)} size="sm">
                    Refresh Logs
                  </Button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {formatDate(log.createdAt)}
                        </TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell className="font-medium">
                          {log.resource || "N/A"}
                        </TableCell>
                        <TableCell>
                          {log.user ? (
                            <div>
                              <div className="font-medium">
                                {log.user.username}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {log.user.email}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">
                              System
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {log.details || "N/A"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {log.ipAddress || "N/A"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1 || isLoading}
                    size="sm"
                    variant="outline"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage === totalPages || isLoading}
                    size="sm"
                    variant="outline"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DPODashboard;
