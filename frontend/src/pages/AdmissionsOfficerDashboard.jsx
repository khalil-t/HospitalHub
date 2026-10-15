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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from 'react-router-dom';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Search,
  Send,
  User,
  AlertTriangle,
  AlertCircle,
  UserPlus,
  Stethoscope,
  Briefcase,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { auditService } from "../services/auditService";
import { ThemeToggle } from "@/components/ThemeToggle";
import { patientService } from "../services/service";
import { serviceApi } from "../services/service";
import { useAuth } from '@/contexts/useAuth';
import { PatientForm } from '@/components/patients/PatientForm';
import { PatientTable } from '@/components/patients/PatientTable';

const patientColumns = [
  {
    key: 'firstName',
    header: 'First Name',
    render: (patient) => (
      <span className="font-medium">{patient.firstName}</span>
    ),
  },
  { key: 'lastName', header: 'Last Name' },
  {
    key: 'dob',
    header: 'Date of Birth',
    render: (patient) => patient.dob || 'N/A',
  },
  {
    key: 'gender',
    header: 'Gender',
    render: (patient) => (
      <Badge
        variant="outline"
        className={
          patient.gender === 'M'
            ? "bg-blue-500/20 text-blue-500 border-blue-500/20"
            : patient.gender === 'F'
            ? "bg-pink-500/20 text-pink-500 border-pink-500/20"
            : "bg-gray-500/20 text-gray-500 border-gray-500/20"
        }
      >
        {patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other'}
      </Badge>
    ),
  },
  {
    key: 'phoneNumber',
    header: 'Phone',
    render: (patient) => (
      <span className="text-sm">{patient.phoneNumber || 'N/A'}</span>
    ),
  },
  {
    key: 'nationalNumber',
    header: 'National Number',
    render: (patient) => (
      <span className="font-mono text-xs">{patient.nationalNumber || 'N/A'}</span>
    ),
  },
  {
    key: 'insuranceNumber',
    header: 'Insurance Number',
    render: (patient) => (
      <span className="font-mono text-xs">{patient.insuranceNumber || 'N/A'}</span>
    ),
  },
  {
    key: 'service',
    header: 'Service',
    render: (patient) =>
      patient.services && patient.services.length > 0 ? (
        <Badge
          variant="outline"
          className="bg-green-500/20 text-green-500 border-green-500/20"
        >
          {patient.services[0]?.name || 'Unknown'}
        </Badge>
      ) : (
        <Badge
          variant="outline"
          className="bg-amber-500/20 text-amber-500 border-amber-500/20"
        >
          No Service
        </Badge>
      ),
  },
];

const AdmissionsOfficerDashboard = () => {
  const [newPatient, setNewPatient] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    contactPhone: "",
    requestedService: "",
    admissionDate: new Date().toISOString().split('T')[0],
    nationalNumber: "",
    insuranceNumber: ""
  });
  const [services, setServices] = useState([]);
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [externDoctorRequest, setExternDoctorRequest] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    specialization: "",
    licenseNumber: "",
    institution: "",
    reasonForAccess: "",
    requestedPatientNames: "",
  });
  const [activeTab, setActiveTab] = useState("newAdmission");
  const [isLoading, setIsLoading] = useState(false);
  const [allPatients, setAllPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [searchPatientTerm, setSearchPatientTerm] = useState("");
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await auditService.logAction('LOGOUT', 'authentication', null,
        'User initiated logout from Admissions Dashboard');

      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');

      toast.success("Logged out successfully", {
        description: "You have been logged out of the system"
      });

      navigate('/login');

    } catch (error) {
      await auditService.logAction('LOGOUT', 'authentication', null,
        `Logout error: ${error.message}`);

      toast.error("Error during logout");
    }
  };

  const handleNewAdmission = async () => {
    if (!newPatient.firstName || !newPatient.lastName || !newPatient.requestedService || !newPatient.dateOfBirth) {
      await auditService.logAction('PATIENT_CREATED', 'patient', null,
        'Failed patient creation - missing required fields',
        null, {
          missingFields: ['firstName', 'lastName', 'requestedService', 'dateOfBirth'],
          providedData: {
            firstName: !!newPatient.firstName,
            lastName: !!newPatient.lastName,
            requestedService: !!newPatient.requestedService,
            dateOfBirth: !!newPatient.dateOfBirth
          }
        });

      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedService = services.find(service => service.code === newPatient.requestedService);

      if (!selectedService) {
        await auditService.logAction('PATIENT_CREATED', 'patient', null,
          'Failed patient creation - invalid service selected',
          null, {
            invalidService: newPatient.requestedService,
            availableServices: services.map(s => s.code)
          });

        toast.error("Invalid service selected");
        setIsSubmitting(false);
        return;
      }

      const patientData = {
        firstName: newPatient.firstName,
        lastName: newPatient.lastName,
        dob: newPatient.dateOfBirth,
        gender: newPatient.gender || undefined,
        phoneNumber: newPatient.contactPhone || undefined,
        serviceId: selectedService.id,
        createdById: user.id,
        nationalNumber: newPatient.nationalNumber,
        insuranceNumber: newPatient.insuranceNumber,
      };

      await auditService.logAction('PATIENT_CREATED', 'patient', null,
        `Attempting to create patient: ${newPatient.firstName} ${newPatient.lastName}`,
        null, {
          patientData: {
            ...patientData,
            serviceCode: newPatient.requestedService,
            serviceName: selectedService.name
          },
          createdBy: user.username
        });

      const result = await patientService.createPatient(patientData);

      await auditService.logAction('PATIENT_CREATED', 'patient', result.id || result.patientId,
        `Patient successfully created from Admissions Dashboard: ${newPatient.firstName} ${newPatient.lastName}`,
        null, {
          patientId: result.id || result.patientId,
          service: newPatient.requestedService,
          serviceName: selectedService.name,
          createdBy: user.username,
          admissionDate: newPatient.admissionDate
        });

      toast.success(`Patient ${newPatient.firstName} ${newPatient.lastName} created successfully!`, {
        description: `Patient ID: ${result.patientId || 'Generated by system'}. Request sent to ${selectedService.name} service.`,
      });

      setNewPatient({
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        gender: "",
        contactPhone: "",
        nationalNumber: "",
        insuranceNumber: "",
        requestedService: "",
        admissionDate: new Date().toISOString().split('T')[0],
      });

      await auditService.logAction('FORM_RESET', 'form', null,
        'New patient admission form reset after successful creation');

      await fetchAllPatients();

    } catch (error) {
      await auditService.logAction('PATIENT_CREATED', 'patient', null,
        `Failed to create patient: ${newPatient.firstName} ${newPatient.lastName} - ${error.message}`,
        null, {
          error: error.message,
          patientData: newPatient,
          errorStack: error.stack
        });

      toast.error("Failed to create patient", {
        description: error.message || "Please check your connection and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchAllPatients = async () => {
    setIsLoading(true);

    await auditService.logAction('VIEW', 'patient_list', null,
      'Attempting to fetch all patients from Admissions Dashboard');

    try {
      const data = await patientService.fetchAllPatients();
      setAllPatients(data);
      setFilteredPatients(data);

      await auditService.logAction('VIEW', 'patient_list', null,
        `Successfully retrieved ${data.length} patients from Admissions Dashboard`,
        null, {
          patientCount: data.length,
          retrievedBy: user.username
        });

    } catch (error) {
      await auditService.logAction('VIEW', 'patient_list', null,
        `Failed to retrieve patients from Admissions Dashboard: ${error.message}`,
        null, {
          error: error.message,
          errorStack: error.stack
        });

      toast.error("Failed to load patients");
      setAllPatients([]);
      setFilteredPatients([]);
    } finally {
      setIsLoading(false);
    }
  };

  const searchPatientsHandler = async () => {
    if (!searchPatientTerm.trim()) {
      setFilteredPatients(allPatients);
      return;
    }

    const searchLower = searchPatientTerm.toLowerCase();
    const filtered = allPatients.filter(patient => {
      const searchFields = [
        patient.firstName,
        patient.lastName,
        patient.id,
        patient.nationalNumber,
        patient.insuranceNumber,
        patient.phoneNumber,
        patient.gender,
      ].filter(Boolean);

      return searchFields.some(field =>
        field.toString().toLowerCase().includes(searchLower)
      );
    });

    setFilteredPatients(filtered);

    await auditService.logSearch('patients',
      {
        searchTerm: searchPatientTerm,
        searchFrom: 'AdmissionsOfficerDashboard',
        searchFields: ['firstName', 'lastName', 'id', 'nationalNumber', 'insuranceNumber', 'phoneNumber', 'gender']
      },
      filtered.length);

    if (filtered.length === 0 && searchPatientTerm.trim()) {
      toast.info("No patients found matching your search");

      await auditService.logAction('SEARCH_PERFORMED', 'patient', null,
        `Search returned no results for term: "${searchPatientTerm}"`);
    }
  };

  const handleExternDoctorRequest = async () => {
    if (!externDoctorRequest.firstName || !externDoctorRequest.lastName ||
        !externDoctorRequest.email) {

      await auditService.logAction('EXTERNAL_DOCTOR_REQUEST', 'external_doctor', null,
        'Failed external doctor request - missing required fields',
        null, {
          missingFields: ['firstName', 'lastName', 'email'],
          providedData: {
            firstName: !!externDoctorRequest.firstName,
            lastName: !!externDoctorRequest.lastName,
            email: !!externDoctorRequest.email
          }
        });

      toast.error("Please fill in all required fields (*)");
      return;
    }

    setIsSubmitting(true);

    try {
      const API_BASE = import.meta.env.VITE_API_URL;

      const requestData = {
        firstName: externDoctorRequest.firstName,
        lastName: externDoctorRequest.lastName,
        email: externDoctorRequest.email,
        phoneNumber: externDoctorRequest.phoneNumber || undefined,
        specialization: externDoctorRequest.specialization || undefined,
        licenseNumber: externDoctorRequest.licenseNumber || undefined,
        institution: externDoctorRequest.institution || undefined,
        reasonForAccess: externDoctorRequest.reasonForAccess || undefined,
        requestedPatientNames: externDoctorRequest.requestedPatientNames || undefined,
      };

      await auditService.logAction('EXTERNAL_DOCTOR_REQUEST', 'external_doctor', null,
        `Submitting external doctor access request for Dr. ${externDoctorRequest.firstName} ${externDoctorRequest.lastName}`,
        null, {
          requestData,
          requestedBy: user.username,
          requestedAt: new Date().toISOString()
        });

      const response = await fetch(`${API_BASE}/external-doctors/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const error = await response.json();

        await auditService.logAction('EXTERNAL_DOCTOR_REQUEST', 'external_doctor', null,
          `Failed external doctor request for Dr. ${externDoctorRequest.firstName} ${externDoctorRequest.lastName}: ${error.message}`,
          null, {
            error: error.message,
            requestData,
            responseStatus: response.status
          });

        throw new Error(error.message || 'Error submitting request');
      }

      const result = await response.json();

      await auditService.logAction('EXTERNAL_DOCTOR_REQUEST', 'external_doctor', result.id || null,
        `Successfully submitted external doctor access request for Dr. ${externDoctorRequest.firstName} ${externDoctorRequest.lastName}`,
        null, {
          requestData,
          requestId: result.id,
          requestedBy: user.username,
          status: 'SUBMITTED'
        });

      toast.success(`External doctor request submitted successfully for Dr. ${externDoctorRequest.firstName} ${externDoctorRequest.lastName}`, {
        description: "Request sent to administration for review",
      });

      setExternDoctorRequest({
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
        specialization: "",
        licenseNumber: "",
        institution: "",
        reasonForAccess: "",
        requestedPatientNames: "",
      });

      await auditService.logAction('FORM_RESET', 'form', null,
        'External doctor request form reset after successful submission');

    } catch (error) {
      await auditService.logAction('EXTERNAL_DOCTOR_REQUEST', 'external_doctor', null,
        `Error submitting external doctor request: ${error.message}`,
        null, {
          error: error.message,
          requestData: externDoctorRequest,
          errorStack: error.stack
        });

      toast.error("Failed to submit request", {
        description: error.message || "Please check your connection and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchServices = async () => {
    setIsLoading(true);

    await auditService.logAction('VIEW', 'services', null,
      'Fetching available services for patient admission');

    try {
      const services = await serviceApi.getAllServices();
      setServices(services);

      await auditService.logAction('VIEW', 'services', null,
        `Loaded ${services.length} services in Admissions Dashboard`,
        null, {
          serviceCount: services.length,
          services: services.map(s => ({ id: s.id, name: s.name, code: s.code }))
        });

    } catch (error) {
      await auditService.logAction('VIEW', 'services', null,
        `Failed to fetch services: ${error.message}`,
        null, {
          error: error.message,
          errorStack: error.stack
        });

      setServices([]);
      toast.error("Failed to load services");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (newTab) => {
    const oldTab = activeTab;
    setActiveTab(newTab);

    auditService.logAction('NAVIGATION', 'tab', null,
      `Navigated from ${oldTab} to ${newTab} tab in Admissions Dashboard`);

    const tabNames = {
      newAdmission: 'New Patient Admission',
      externRequest: 'External Doctor Request',
      serviceChefRequest: 'View All Patients'
    };

    auditService.logPageVisit(`Admissions Dashboard - ${tabNames[newTab] || newTab}`);
  };

  const handlePatientFieldChange = (field, value) => {
    setNewPatient({ ...newPatient, [field]: value });

    if (['firstName', 'lastName', 'requestedService'].includes(field) && value) {
      auditService.logAction('UI_INTERACTION', 'form_field', null,
        `Updated patient ${field} field in admission form`);
    }
  };

  const handleExternalDoctorFieldChange = (field, value) => {
    setExternDoctorRequest({ ...externDoctorRequest, [field]: value });

    if (['firstName', 'lastName', 'email', 'specialization'].includes(field) && value) {
      auditService.logAction('UI_INTERACTION', 'form_field', null,
        `Updated external doctor ${field} field in request form`);
    }
  };

  const handleSearchTermChange = (value) => {
    setSearchPatientTerm(value);

    if (value.length > 2) {
      auditService.logAction('UI_INTERACTION', 'search', null,
        `User typing in patient search: "${value.substring(0, 10)}..."`);
    }
  };

  const handleClearSearch = async () => {
    const previousTerm = searchPatientTerm;
    setSearchPatientTerm("");
    setFilteredPatients(allPatients);

    await auditService.logAction('UI_INTERACTION', 'search', null,
      `Cleared patient search (was: "${previousTerm}")`,
      null, {
        previousTerm,
        resultCount: allPatients.length
      });
  };

  const handleRefreshPatients = async () => {
    await auditService.logAction('UI_INTERACTION', 'refresh', null,
      'User clicked refresh patients button');

    await fetchAllPatients();
  };

  useEffect(() => {
    const initializeDashboard = async () => {
      await auditService.logDashboardAccess('Admissions Officer Dashboard');

      await auditService.logAction('DASHBOARD_ACCESSED', 'dashboard', null,
        `Admissions Officer Dashboard accessed by ${user.username}`,
        null, {
          userRole: user.roles,
          userId: user.id,
          accessTime: new Date().toISOString(),
          userAgent: navigator.userAgent
        });

      await fetchServices();
      await fetchAllPatients();
    };

    if (user) {
      initializeDashboard();
    }
  }, [user]);

  useEffect(() => {
    if (searchPatientTerm.length > 0) {
      const timeoutId = setTimeout(() => {
        searchPatientsHandler();
      }, 500);

      return () => clearTimeout(timeoutId);
    } else {
      setFilteredPatients(allPatients);
    }
  }, [searchPatientTerm, allPatients]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-green-50/20 dark:to-green-950/20 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Stethoscope className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                  MediSecure Admissions
                </h1>
                <p className="text-muted-foreground font-medium text-sm md:text-base">
                  Patient Admissions & External Access Management
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            <div className="text-right">
              <p className="font-semibold text-foreground">Ms. {user?.username || 'User'}</p>
              <p className="text-sm text-muted-foreground">Admissions Officer</p>
            </div>
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="border-border/50 bg-card/50 backdrop-blur-sm hover:bg-secondary/50 transition-all duration-200"
            >
              <User className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 group col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-3 p-4">
              <CardTitle className="text-sm font-semibold text-foreground/80">
                Total Patients
              </CardTitle>
              <div className="p-2 bg-blue-500/10 rounded-lg group-hover:scale-110 transition-transform">
                <User className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl md:text-3xl font-bold text-blue-500 mb-1">
                {allPatients.length}
              </div>
              <p className="text-xs text-muted-foreground">Registered patients</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="bg-secondary/30 backdrop-blur-sm border border-border/50 p-1 rounded-xl w-full md:w-auto">
            <TabsTrigger
              value="newAdmission"
              className="data-[state=active]:bg-green-500 data-[state=active]:text-white rounded-lg transition-all duration-200 flex-1 md:flex-none"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              <span className="hidden md:inline">New Admission</span>
              <span className="md:hidden">Admission</span>
            </TabsTrigger>
            <TabsTrigger
              value="externRequest"
              className="data-[state=active]:bg-amber-500 data-[state=active]:text-white rounded-lg transition-all duration-200 flex-1 md:flex-none"
            >
              <Stethoscope className="mr-2 h-4 w-4" />
              <span className="hidden md:inline">External Doctor</span>
              <span className="md:hidden">External</span>
            </TabsTrigger>
            <TabsTrigger
              value="serviceChefRequest"
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg transition-all duration-200 flex-1 md:flex-none"
            >
              <Briefcase className="mr-2 h-4 w-4" />
              <span className="hidden md:inline">View All Patients</span>
              <span className="md:hidden">Patients</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="newAdmission" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="lg:col-span-2 border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-foreground">
                    New Patient Admission
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Register a new patient and request service assignment
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <PatientForm
                    formData={newPatient}
                    onFieldChange={handlePatientFieldChange}
                    services={services}
                    isLoading={isLoading}
                    isSubmitting={isSubmitting}
                    onSubmit={handleNewAdmission}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="externRequest" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="lg:col-span-2 border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-foreground">
                    External Doctor Access Request
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Submit request for external doctor access to patient medical records
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-foreground">
                        First Name *
                      </label>
                      <Input
                        placeholder="Robert"
                        value={externDoctorRequest.firstName}
                        onChange={(e) => handleExternalDoctorFieldChange('firstName', e.target.value)}
                        className="bg-background border-border/50 text-foreground"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-foreground">
                        Last Name *
                      </label>
                      <Input
                        placeholder="Kim"
                        value={externDoctorRequest.lastName}
                        onChange={(e) => handleExternalDoctorFieldChange('lastName', e.target.value)}
                        className="bg-background border-border/50 text-foreground"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-foreground">
                        Email Address *
                      </label>
                      <Input
                        type="email"
                        placeholder="dr.kim@hospital.com"
                        value={externDoctorRequest.email}
                        onChange={(e) => handleExternalDoctorFieldChange('email', e.target.value)}
                        className="bg-background border-border/50 text-foreground"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-foreground">
                        Phone Number
                      </label>
                      <Input
                        placeholder="+1 (555) 123-4567"
                        value={externDoctorRequest.phoneNumber}
                        onChange={(e) => handleExternalDoctorFieldChange('phoneNumber', e.target.value)}
                        className="bg-background border-border/50 text-foreground"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-foreground">
                        Specialization
                      </label>
                      <Input
                        placeholder="Cardiology"
                        value={externDoctorRequest.specialization}
                        onChange={(e) => handleExternalDoctorFieldChange('specialization', e.target.value)}
                        className="bg-background border-border/50 text-foreground"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-foreground">
                        License Number
                      </label>
                      <Input
                        placeholder="MD123456"
                        value={externDoctorRequest.licenseNumber}
                        onChange={(e) => handleExternalDoctorFieldChange('licenseNumber', e.target.value)}
                        className="bg-background border-border/50 text-foreground"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground">
                      Institution/Hospital
                    </label>
                    <Input
                      placeholder="City General Hospital"
                      value={externDoctorRequest.institution}
                      onChange={(e) => handleExternalDoctorFieldChange('institution', e.target.value)}
                      className="bg-background border-border/50 text-foreground"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground">
                      Patient Full Name
                    </label>
                    <Input
                      placeholder="John Smith"
                      value={externDoctorRequest.requestedPatientNames}
                      onChange={(e) => handleExternalDoctorFieldChange('requestedPatientNames', e.target.value)}
                      className="bg-background border-border/50 text-foreground"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground">
                      Reason for Access Request *
                    </label>
                    <Textarea
                      placeholder="Please explain why this external doctor needs access to patient records (e.g., consultation, continuity of care, specialist review, etc.)..."
                      value={externDoctorRequest.reasonForAccess}
                      onChange={(e) => handleExternalDoctorFieldChange('reasonForAccess', e.target.value)}
                      className="bg-background border-border/50 text-foreground min-h-32 resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-3 p-4 rounded-lg border border-border/50 bg-background/50">
                    <div className="p-2 bg-amber-500/10 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        Important Notice
                      </p>
                      <p className="text-sm text-muted-foreground">
                        This request will be sent to hospital administration for review and approval. External doctor access requires proper authorization and validation.
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={handleExternDoctorRequest}
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Submitting Request...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Submit to Administration
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="serviceChefRequest" className="space-y-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl font-bold text-foreground">
                      All Patients in Hospital
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      View and search all patient records in the hospital
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search patients by name, ID, or phone..."
                        value={searchPatientTerm}
                        onChange={(e) => handleSearchTermChange(e.target.value)}
                        className="pl-10 bg-background border-border/50 text-foreground w-full md:w-64"
                      />
                    </div>
                    {searchPatientTerm && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearSearch}
                        className="border-border/50"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : filteredPatients.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      {searchPatientTerm ? "No patients found matching your search" : "No patients found"}
                    </p>
                    {searchPatientTerm && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearSearch}
                        className="mt-2"
                      >
                        Clear search
                      </Button>
                    )}
                  </div>
                ) : (
                  <PatientTable
                    patients={filteredPatients}
                    columns={patientColumns}
                  />
                )}

                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                  <div>
                    Showing {filteredPatients.length} of {allPatients.length} patients
                  </div>
                  {allPatients.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefreshPatients}
                      disabled={isLoading}
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdmissionsOfficerDashboard;
