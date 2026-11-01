import { useCallback, useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  User,
  Filter,
  Stethoscope,
  Users,
  Eye,
  FileText,
  UserSearch,
  EyeOff,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/useAuth";
import {
  canEditMedicalRecord,
  getMedicalRecordActionPermissions,
} from "@/lib/roles";
import { medicalRecordService, patientService } from "../services/service";
import MedicalRecordModal from "../components/MedicalRecordModal";

const buildEmptyRecord = (patient) => ({
  id: null,
  patientId: patient.id,
  title: `Medical Record - ${patient.firstName} ${patient.lastName}`,
  content: "No medical record has been created for this patient yet.",
  diagnosis: "No diagnosis recorded",
  allergies: [],
  prescriptions: [],
  recordDate: new Date().toISOString().split("T")[0],
  _isReadOnly: true,
  _isEmpty: true,
});

const buildErrorRecord = (patient) => ({
  id: null,
  patientId: patient.id,
  title: `Medical Record - ${patient.firstName} ${patient.lastName}`,
  content:
    "Unable to retrieve medical records at this time. Please try again later.",
  diagnosis: "Error loading diagnosis",
  allergies: [],
  prescriptions: [],
  recordDate: new Date().toISOString().split("T")[0],
  _isReadOnly: true,
  _isError: true,
});

const buildNewRecord = (patientId) => ({
  id: null,
  patientId,
  title: "",
  content: "",
  diagnosis: "",
  allergies: [],
  prescriptions: [],
  responsibleDoctors: [],
  recordDate: new Date().toISOString().split("T")[0],
  _isReadOnly: false,
});

const removePrescriptionMedicalRecord = (record) => {
  if (!record) return record;

  const cleaned = { ...record };

  if (Array.isArray(cleaned.prescriptions)) {
    cleaned.prescriptions = cleaned.prescriptions.map((prescription) => {
      const rest = { ...prescription };
      delete rest.medicalRecord;
      return rest;
    });
  }

  return cleaned;
};

const DoctorDashboard = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("patients");
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const { user, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const recordPermissions = getMedicalRecordActionPermissions(
    user?.roles || [],
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [currentMedicalRecord, setCurrentMedicalRecord] = useState(null);
  const [modalPatient, setModalPatient] = useState(null);
  const [isLoadingRecord, setIsLoadingRecord] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);

  const fetchPatients = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await medicalRecordService.getPatientsForDoctor(user.id);
      setPatients(data);
    } catch {
      setPatients([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const handleSearchPatients = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      toast.info("Please enter a search term");
      return;
    }

    setIsSearching(true);

    try {
      const searchCriteria = {};
      const term = searchQuery.trim();

      searchCriteria.firstName = term;
      searchCriteria.lastName = "";

      let results = await patientService.searchPatients(searchCriteria);

      if (!results || results.length === 0) {
        const nameParts = term.split(/\s+/);
        if (nameParts.length >= 2) {
          searchCriteria.firstName = nameParts[0];
          searchCriteria.lastName = nameParts[nameParts.length - 1];
          results = await patientService.searchPatients(searchCriteria);
        }
      }

      setSearchResults(results || []);

      if (!results || results.length === 0) {
        toast.info(
          "No patients found. Try searching with full name (First Last)",
        );
      } else {
        toast.success(`Found ${results.length} patient(s)`);
      }
    } catch (error) {
      toast.error(error.message || "Failed to search patients");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleViewMedicalRecordFromSearch = async (patient) => {
    setModalPatient(patient);
    setIsRecordModalOpen(true);
    setIsLoadingRecord(true);
    setIsViewOnly(true);

    try {
      const existingRecord =
        await medicalRecordService.getMedicalRecordByPatient(patient.id);

      if (existingRecord) {
        const formattedRecord = {
          id: existingRecord.id || null,
          patientId: patient.id,
          title:
            existingRecord.title ||
            `Medical Record - ${patient.firstName} ${patient.lastName}`,
          content: existingRecord.content || "",
          diagnosis: existingRecord.diagnosis || "",
          allergies: existingRecord.allergies ?? [],
          prescriptions: existingRecord.prescriptions ?? [],
          recordDate:
            existingRecord.recordDate ||
            existingRecord.createdAt ||
            new Date().toISOString().split("T")[0],
          _isReadOnly: true,
          ...existingRecord,
        };

        setCurrentMedicalRecord(formattedRecord);
        toast.success("Medical record loaded");
      } else {
        setCurrentMedicalRecord(buildEmptyRecord(patient));
        toast.info("No medical record found for this patient");
      }
    } catch (error) {
      if (
        (error.message && error.message.includes("404")) ||
        error.message.includes("not found")
      ) {
        setCurrentMedicalRecord(buildEmptyRecord(patient));
        toast.info("No medical record found for this patient");
      } else {
        toast.error("Failed to load medical record");
        setCurrentMedicalRecord(buildErrorRecord(patient));
      }
    } finally {
      setIsLoadingRecord(false);
    }
  };

  const handleViewMedicalRecord = async (medicalRecordWithPatient) => {
    const patientDetails = medicalRecordWithPatient.patient;
    setModalPatient(patientDetails);
    setIsViewOnly(false);

    setIsRecordModalOpen(true);
    setIsLoadingRecord(true);

    try {
      const existingRecord =
        await medicalRecordService.getMedicalRecordByPatient(patientDetails.id);

      if (existingRecord) {
        const normalizedRecord = {
          ...existingRecord,
          id: existingRecord.id || null,
          patientId: patientDetails.id,
          title: existingRecord.title || "Medical Record",
          content: existingRecord.content || "",
          diagnosis: existingRecord.diagnosis || "",
          allergies: Array.isArray(existingRecord.allergies)
            ? existingRecord.allergies
            : [],
          prescriptions: Array.isArray(existingRecord.prescriptions)
            ? existingRecord.prescriptions.map((p) => ({
                id: p.id || `temp-${Math.random()}`,
                name: p.medication || p.name || "",
                dosage: p.dose || p.dosage || "",
                frequency: p.frequency || "",
                duration: p.duration || "",
              }))
            : [],
          responsibleDoctors: Array.isArray(existingRecord.responsibleDoctors)
            ? existingRecord.responsibleDoctors.map((doc) =>
                typeof doc === "object"
                  ? { id: doc.id, name: doc.name || doc.fullName || "" }
                  : { id: doc, name: "" },
              )
            : [],
          _isReadOnly: false,
        };

        setCurrentMedicalRecord(normalizedRecord);
      } else {
        setCurrentMedicalRecord(buildNewRecord(patientDetails.id));
      }
    } catch (error) {
      if (
        error.message &&
        (error.message.includes("404") || error.message.includes("not found"))
      ) {
        setCurrentMedicalRecord(buildNewRecord(patientDetails.id));
      } else {
        toast.error("Failed to load medical record");
        setCurrentMedicalRecord({
          id: "error",
          title: "Error loading record",
          content: "",
          diagnosis: "",
          allergies: [],
          prescriptions: [],
          responsibleDoctors: [],
          _isReadOnly: false,
        });
      }
    } finally {
      setIsLoadingRecord(false);
    }
  };

  const handleSaveMedicalRecord = async (record) => {
    if (
      isViewOnly ||
      !canEditMedicalRecord(user?.roles || [], record, user?.id)
    ) {
      toast.error("You do not have permission to edit this medical record");
      return;
    }

    try {
      const recordToSave = {
        title: record.title || null,
        content: record.content || null,
        diagnosis: record.diagnosis || null,
        patientId: record.patientId || modalPatient?.id,
        allergies: Array.isArray(record.allergies) ? record.allergies : [],
        recordDate: record.recordDate || new Date().toISOString().split("T")[0],
        responsibleDoctors: Array.isArray(record.responsibleDoctors)
          ? record.responsibleDoctors
              .map((doc) => {
                if (typeof doc === "string") return doc;
                if (doc && doc.id) return doc.id;
                return null;
              })
              .filter(Boolean)
          : [],
        prescriptions: Array.isArray(record.prescriptions)
          ? record.prescriptions.map((prescription) => ({
              medication: prescription.medication || prescription.name || "",
              dose: prescription.dose || prescription.dosage || "",
              frequency: prescription.frequency || "",
              duration: prescription.duration || "",
              ...(prescription.id && prescription.id !== "temp-"
                ? { id: prescription.id }
                : {}),
            }))
          : [],
      };

      let saved;

      if (record.id && record.id !== "error") {
        saved = await medicalRecordService.updateMedicalRecord(
          record.id,
          recordToSave,
        );
      } else {
        saved = await medicalRecordService.createMedicalRecord({
          ...recordToSave,
          patientId: modalPatient.id,
        });
      }

      setCurrentMedicalRecord(removePrescriptionMedicalRecord(saved));

      toast.success("Medical record saved successfully!");

      fetchPatients();
    } catch (error) {
      toast.error(
        "Failed to save medical record: " + (error.message || "Unknown error"),
      );
    }
  };

  const handleDeleteMedicalRecord = async (record) => {
    if (!record?.id) {
      toast.error("There is no medical record to delete");
      return;
    }

    if (!window.confirm("Delete this medical record permanently?")) return;

    try {
      await medicalRecordService.deleteMedicalRecord(record.id);
      toast.success("Medical record deleted.");
      if (currentMedicalRecord?.id === record.id) {
        setIsRecordModalOpen(false);
        setCurrentMedicalRecord(null);
        setModalPatient(null);
      }
      fetchPatients();
    } catch (error) {
      toast.error(error.message || "Failed to delete medical record");
    }
  };

  useEffect(() => {
    if (activeTab !== "search") {
      setSearchResults([]);
      setSearchQuery("");
    }
  }, [activeTab]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === "Enter" && activeTab === "search" && searchQuery.trim()) {
        handleSearchPatients();
      }
    };

    window.addEventListener("keypress", handleKeyPress);
    return () => window.removeEventListener("keypress", handleKeyPress);
  }, [searchQuery, activeTab, handleSearchPatients]);

  useEffect(() => {
    if (user) {
      fetchPatients();
    }
  }, [user, fetchPatients]);

  const getPatientFullName = (patient) => {
    return (
      `${patient.firstName || ""} ${patient.lastName || ""}`.trim() ||
      "Unknown Patient"
    );
  };

  if (isLoading) return <div>Loading...</div>;
  if (!user) return <div>Please log in</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-blue-50/20 dark:to-blue-950/20 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
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
                  Doctor Patient Management Portal
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            <div className="text-right">
              <p className="font-semibold text-foreground">
                Dr. {user?.username || "User"}
              </p>
              <p className="text-sm text-muted-foreground">
                {user?.role || "Doctor"}
              </p>
            </div>
            <ThemeToggle />
            <Button
              variant="outline"
              onClick={async () => {
                await logout();
                navigate("/login");
              }}
              size="sm"
              className="border-border/50 bg-card/50 backdrop-blur-sm hover:bg-secondary/50 transition-all duration-200"
            >
              <User className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 group col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-3 p-4">
              <CardTitle className="text-sm font-semibold text-foreground/80">
                My Patients
              </CardTitle>
              <div className="p-2 bg-blue-500/10 rounded-lg group-hover:scale-110 transition-transform">
                <Users className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl md:text-3xl font-bold text-blue-500 mb-1">
                {patients.length}
              </div>
              <p className="text-xs text-muted-foreground">Full access</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 group col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-3 p-4">
              <CardTitle className="text-sm font-semibold text-foreground/80">
                Search Patients
              </CardTitle>
              <div className="p-2 bg-purple-500/10 rounded-lg group-hover:scale-110 transition-transform">
                <UserSearch className="h-4 w-4 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl md:text-3xl font-bold text-purple-500 mb-1">
                ∞
              </div>
              <p className="text-xs text-muted-foreground">View only access</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 group col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-3 p-4">
              <CardTitle className="text-sm font-semibold text-foreground/80">
                Access Level
              </CardTitle>
              <div className="p-2 bg-amber-500/10 rounded-lg group-hover:scale-110 transition-transform">
                <Lock className="h-4 w-4 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl md:text-3xl font-bold text-amber-500 mb-1">
                {user?.role || "Doctor"}
              </div>
              <p className="text-xs text-muted-foreground">Role-based access</p>
            </CardContent>
          </Card>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="bg-secondary/30 backdrop-blur-sm border border-border/50 p-1 rounded-xl w-full md:w-auto">
            <TabsTrigger
              value="patients"
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg transition-all duration-200 flex-1 md:flex-none"
            >
              <Users className="mr-2 h-4 w-4" />
              <span className="hidden md:inline">My Patients</span>
              <span className="md:hidden">Patients</span>
            </TabsTrigger>
            <TabsTrigger
              value="search"
              className="data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-lg transition-all duration-200 flex-1 md:flex-none"
            >
              <UserSearch className="mr-2 h-4 w-4" />
              <span className="hidden md:inline">Search Patients</span>
              <span className="md:hidden">Search</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="patients" className="space-y-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl font-bold text-foreground">
                      My Patients
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Patients under your care - Full access to medical records
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search my patients..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-background border-border/50 text-foreground w-full md:w-64"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border/50"
                    >
                      <Filter className="mr-2 h-4 w-4" />
                      Filter
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : patients.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No patients assigned
                    </h3>
                    <p className="text-muted-foreground">
                      You don't have any patients assigned to you yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {patients
                      .filter((patient) => {
                        if (!searchTerm) return true;
                        const patientObj = patient.patient || patient;
                        const fullName =
                          getPatientFullName(patientObj).toLowerCase();
                        return fullName.includes(searchTerm.toLowerCase());
                      })
                      .map((patientData) => {
                        const patient = patientData.patient || patientData;
                        return (
                          <div
                            key={patient.id}
                            className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-background/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all duration-200 group"
                          >
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 flex items-center justify-center rounded-full bg-blue-500/10 text-blue-500 font-bold">
                                {patient.firstName?.slice(0, 1) || "P"}
                              </div>
                              <div>
                                <div className="flex items-center gap-3">
                                  <h3 className="font-semibold text-foreground">
                                    {getPatientFullName(patient)}
                                  </h3>
                                  <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/20">
                                    Full Access
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  DOB: {patient.dob || "N/A"} • Gender:{" "}
                                  {patient.gender || "N/A"}
                                </p>
                                <div className="flex items-center gap-4 mt-1">
                                  <span className="text-xs text-muted-foreground">
                                    Phone: {patient.phoneNumber || "N/A"}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 gap-2"
                                onClick={() =>
                                  handleViewMedicalRecord(patientData)
                                }
                                disabled={
                                  isLoadingRecord &&
                                  modalPatient?.id === patient.id
                                }
                              >
                                {isLoadingRecord &&
                                modalPatient?.id === patient.id ? (
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-1" />
                                ) : (
                                  <FileText className="h-4 w-4 mr-1" />
                                )}
                                {isLoadingRecord &&
                                modalPatient?.id === patient.id
                                  ? "Loading..."
                                  : canEditMedicalRecord(
                                        user?.roles || [],
                                        patientData,
                                        user?.id,
                                      )
                                    ? "Edit Record"
                                    : "View Record"}
                              </Button>
                              {recordPermissions.canDelete && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600"
                                  onClick={() =>
                                    handleDeleteMedicalRecord(patientData)
                                  }
                                >
                                  Delete
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="search" className="space-y-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl font-bold text-foreground">
                      Search Patients
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Search across all departments - View only access to
                      medical records
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by patient name (e.g., John Doe or John)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-background border-border/50 text-foreground"
                      onKeyPress={(e) =>
                        e.key === "Enter" && handleSearchPatients()
                      }
                    />
                  </div>
                  <Button
                    onClick={handleSearchPatients}
                    disabled={isSearching || !searchQuery.trim()}
                    className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600"
                  >
                    {isSearching ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Search
                      </>
                    )}
                  </Button>
                </div>

                <div className="bg-purple-50 dark:bg-purple-950/30 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-start gap-3">
                    <EyeOff className="h-5 w-5 text-purple-500 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-foreground">
                        View Only Access
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Medical records found through search are view-only. You
                        cannot edit records of patients not under your direct
                        care.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {isSearching ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
                        <p className="text-muted-foreground">
                          Searching patients...
                        </p>
                      </div>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-foreground">
                          Found {searchResults.length} patient(s)
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSearchResults([])}
                          className="text-muted-foreground"
                        >
                          Clear Results
                        </Button>
                      </div>

                      {searchResults.map((patient) => (
                        <div
                          key={patient.id}
                          className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border border-border/50 bg-background/50 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 transition-all duration-200"
                        >
                          <div className="flex items-start md:items-center gap-4 mb-3 md:mb-0">
                            <div className="h-12 w-12 flex items-center justify-center rounded-full bg-purple-500/10 text-purple-500 font-bold text-lg">
                              {(patient.firstName?.slice(0, 1) || "P") +
                                (patient.lastName?.slice(0, 1) || "")}
                            </div>
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="font-semibold text-foreground">
                                  {getPatientFullName(patient)}
                                </h3>
                                <Badge className="bg-purple-500/20 text-purple-500 border-purple-500/20">
                                  View Only
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <Button
                            onClick={() =>
                              handleViewMedicalRecordFromSearch(patient)
                            }
                            size="sm"
                            variant="outline"
                            className="border-purple-500 text-purple-500 hover:bg-purple-50 hover:text-purple-600 gap-2 mt-3 md:mt-0"
                            disabled={
                              isLoadingRecord && modalPatient?.id === patient.id
                            }
                          >
                            {isLoadingRecord &&
                            modalPatient?.id === patient.id ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-500 border-t-transparent mr-1" />
                            ) : (
                              <Eye className="h-4 w-4 mr-1" />
                            )}
                            {isLoadingRecord && modalPatient?.id === patient.id
                              ? "Loading..."
                              : "View Record"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : searchQuery ? (
                    <div className="text-center py-12">
                      <UserSearch className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        No patients found
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Try searching with a different name or check your
                        spelling
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Eye className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        Search for Patients
                      </h3>
                      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                        Search for patients across all departments. Medical
                        records are view-only for patients not under your direct
                        care.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto">
                        <Card className="border-border/50 p-4 text-left">
                          <div className="flex items-start gap-3">
                            <Users className="h-5 w-5 text-blue-500 mt-0.5" />
                            <div>
                              <h4 className="font-semibold mb-2">
                                My Patients
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                Full access to edit medical records
                              </p>
                            </div>
                          </div>
                        </Card>
                        <Card className="border-border/50 p-4 text-left">
                          <div className="flex items-start gap-3">
                            <EyeOff className="h-5 w-5 text-purple-500 mt-0.5" />
                            <div>
                              <h4 className="font-semibold mb-2">
                                Searched Patients
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                View-only access to medical records
                              </p>
                            </div>
                          </div>
                        </Card>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <MedicalRecordModal
        isOpen={isRecordModalOpen}
        onClose={() => {
          setIsRecordModalOpen(false);
          setModalPatient(null);
          setCurrentMedicalRecord(null);
          setIsViewOnly(false);
        }}
        patient={modalPatient}
        medicalRecord={currentMedicalRecord}
        onSave={handleSaveMedicalRecord}
        readOnly={
          isViewOnly ||
          !canEditMedicalRecord(
            user?.roles || [],
            currentMedicalRecord,
            user?.id,
          )
        }
        isViewOnly={isViewOnly}
        isLoading={isLoadingRecord}
      />
    </div>
  );
};

export default DoctorDashboard;
