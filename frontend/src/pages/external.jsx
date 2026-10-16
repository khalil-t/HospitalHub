import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, FileText, Search, Loader, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/useAuth';
import { externalDoctorService, medicalRecordService } from '../services/service';
import MedicalRecordModal2 from '../components/MedicalRecordModal2';

const AllPatientsDashboard = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPatients, setFilteredPatients] = useState([]);
  const { user } = useAuth();
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [recordLoading, setRecordLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);

        const doctorEmail = user?.email;

        if (!doctorEmail) {
          throw new Error('User email not found');
        }

        const data = await externalDoctorService.getPatientsByEmail(doctorEmail);

        setPatients(data);
        setFilteredPatients(data);
      } catch (err) {
        setError(err.message);
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (user?.email) {
      fetchPatients();
    }
  }, [user]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredPatients(patients);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = patients.filter((patient) => {
      const fullName =
        `${patient.firstName || ''} ${patient.lastName || ''}`.toLowerCase();
      const email = patient.email?.toLowerCase() || '';
      const phone = patient.phoneNumber?.toLowerCase() || '';

      return (
        fullName.includes(searchLower) ||
        email.includes(searchLower) ||
        phone.includes(searchLower)
      );
    });

    setFilteredPatients(filtered);
  }, [searchTerm, patients]);

  const getPatientFullName = (patient) =>
    `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unknown';

  const handleViewRecord = async (patientId, patient) => {
    try {
      setRecordLoading(true);
      setSelectedPatient(patient);
      toast.info('Loading medical record...');

      let medicalRecord;
      try {
        medicalRecord = await medicalRecordService.getMedicalRecordByPatient(
          patientId,
        );
      } catch (err) {
        if (err.status === 404) {
          setSelectedRecord(null);
          toast.info('No medical record found for this patient.');
          return;
        }
        throw err;
      }

      if (!medicalRecord) {
        setSelectedRecord(null);
        toast.info('No medical record found for this patient.');
        return;
      }

      setSelectedRecord({
        ...medicalRecord,
        recordDate: medicalRecord.recordDate
          ? medicalRecord.recordDate.split('T')[0]
          : new Date().toISOString().split('T')[0],
        allergies: Array.isArray(medicalRecord.allergies)
          ? medicalRecord.allergies
          : [],
        prescriptions: Array.isArray(medicalRecord.prescriptions)
          ? medicalRecord.prescriptions.map((prescription) => ({
              id: prescription.id,
              name: prescription.medication || prescription.name || '',
              dosage: prescription.dose || prescription.dosage || '',
              frequency: prescription.frequency || '',
              duration: prescription.duration || '',
              notes: prescription.notes || '',
            }))
          : [],
      });
      setIsModalOpen(true);
    } catch (err) {
      toast.error(err.message || 'Failed to load medical record');
    } finally {
      setRecordLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPatient(null);
    setSelectedRecord(null);
  };

  if (loading)
    return (
      <div className="min-h-screen p-4 flex justify-center items-center">
        <Loader className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-muted-foreground">Loading patients...</span>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen p-4 flex justify-center items-center">
        <Card className="border-red-500/50 bg-red-50/50 dark:bg-red-950/20 max-w-md">
          <CardHeader className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
            <Button
              className="mt-4 bg-red-600 hover:bg-red-700"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );

  return (
    <div className="min-h-screen p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-4">Patient Demanded</h1>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="mb-4 text-sm text-gray-500">
        Showing {filteredPatients.length} of {patients.length} patients
      </div>

      {filteredPatients.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-gray-50/50 dark:bg-gray-900/20">
          <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No patients found</h3>
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm
              ? 'Try a different search term'
              : 'No patients available'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.map((patient) => (
            <Card
              key={patient.id}
              className="hover:shadow-lg transition-all duration-300 border border-gray-200 dark:border-gray-800"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">
                    {getPatientFullName(patient)}
                  </CardTitle>
                  <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <CardDescription className="flex items-center gap-2">
                  <span>{patient.email || 'No email'}</span>
                  {patient.email && (
                    <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                      Verified
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium min-w-[80px]">Phone:</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {patient.phoneNumber || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium min-w-[80px]">DOB:</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {patient.dob
                      ? new Date(patient.dob).toLocaleDateString()
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium min-w-[80px]">Gender:</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {patient.gender || 'N/A'}
                  </span>
                </div>
              </CardContent>
              <div className="p-4 pt-0">
                <Button
                  size="sm"
                  className="w-full bg-blue-600 hover:bg-blue-700 gap-2"
                  onClick={() => handleViewRecord(patient.id, patient)}
                  disabled={recordLoading}
                >
                  <FileText className="h-4 w-4" />
                  {recordLoading && selectedPatient?.id === patient.id ? (
                    <span className="flex items-center gap-2">
                      <Loader className="h-3 w-3 animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    'View Medical Record'
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {isModalOpen && selectedRecord && (
        <MedicalRecordModal2
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          patient={selectedPatient}
          medicalRecord={selectedRecord}
        />
      )}
    </div>
  );
};

export default AllPatientsDashboard;
