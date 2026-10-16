import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Pill,
  AlertTriangle,
  FileText,
  User,
  Calendar,
  Stethoscope,
  X,
  CheckCircle,
  Clock,
  UserCheck,
  FileSignature,
} from 'lucide-react';

export default function MedicalRecordModal2({
  isOpen,
  onClose,
  patient,
  medicalRecord,
}) {
  const [recordData, setRecordData] = useState(null);

  useEffect(() => {
    const formatRecord = () => {
      if (!medicalRecord) {
        setRecordData(null);
        return;
      }

      setRecordData({
        ...medicalRecord,
        recordDate: medicalRecord.recordDate
          ? new Date(medicalRecord.recordDate).toLocaleDateString()
          : 'Not specified',
        createdAt: medicalRecord.createdAt
          ? new Date(medicalRecord.createdAt).toLocaleString()
          : '',
        updatedAt: medicalRecord.updatedAt
          ? new Date(medicalRecord.updatedAt).toLocaleString()
          : '',
        allergies: Array.isArray(medicalRecord.allergies)
          ? medicalRecord.allergies
          : [],
        prescriptions: Array.isArray(medicalRecord.prescriptions)
          ? medicalRecord.prescriptions.map((prescription) => ({
              ...prescription,
              createdAt: prescription.createdAt
                ? new Date(prescription.createdAt).toLocaleDateString()
                : '',
            }))
          : [],
      });
    };

    formatRecord();
  }, [medicalRecord]);

  if (!recordData) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <DialogTitle className="text-xl">
                Medical Record - {patient?.firstName} {patient?.lastName}
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                View Only
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>Patient ID: {patient?.id}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Record Date: {recordData.recordDate}</span>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <Label className="text-sm font-medium">Created</Label>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {recordData.createdAt}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck className="h-4 w-4 text-gray-500" />
                  <Label className="text-sm font-medium">Last Updated</Label>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {recordData.updatedAt || 'Never updated'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileSignature className="h-4 w-4 text-gray-500" />
                  <Label className="text-sm font-medium">Record ID</Label>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 font-mono truncate">
                  {recordData.id}
                </p>
              </CardContent>
            </Card>
          </div>

          {recordData.title && (
            <Card>
              <CardContent className="p-4">
                <Label className="text-lg font-semibold block mb-3">
                  Record Title
                </Label>
                <div className="p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
                  <p className="text-gray-700 dark:text-gray-300 text-lg">
                    {recordData.title}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {recordData.diagnosis && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Stethoscope className="h-5 w-5 text-blue-600" />
                  <Label className="text-lg font-semibold">Diagnosis</Label>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {recordData.diagnosis}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {recordData.content && (
            <Card>
              <CardContent className="p-4">
                <Label className="text-lg font-semibold block mb-3">
                  Clinical Notes
                </Label>
                <div className="p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {recordData.content}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <Label className="text-lg font-semibold">Allergies</Label>
              </div>

              {recordData.allergies.length > 0 ? (
                <div className="space-y-2">
                  {recordData.allergies.map((allergy, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-3 rounded-lg"
                    >
                      <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <span className="font-medium">{allergy}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
                  No allergies recorded
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Pill className="h-5 w-5 text-green-600" />
                <Label className="text-lg font-semibold">Prescriptions</Label>
              </div>

              {recordData.prescriptions.length > 0 ? (
                <div className="space-y-4">
                  {recordData.prescriptions.map((prescription, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg bg-green-50 text-green-900 dark:bg-green-900/20 dark:text-green-300 border border-green-200 dark:border-green-800"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <Pill className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                        <div>
                          <h4 className="font-bold text-lg">
                            {prescription.name || prescription.medication}
                          </h4>
                          {prescription.createdAt && (
                            <p className="text-sm text-green-700 dark:text-green-400 opacity-80">
                              Prescribed on: {prescription.createdAt}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-green-700 dark:text-green-400 block mb-1">
                            Dosage
                          </Label>
                          <p className="font-semibold">
                            {prescription.dosage || prescription.dose}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-green-700 dark:text-green-400 block mb-1">
                            Frequency
                          </Label>
                          <p className="font-semibold">
                            {prescription.frequency}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-green-700 dark:text-green-400 block mb-1">
                            Duration
                          </Label>
                          <p className="font-semibold">
                            {prescription.duration}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-green-700 dark:text-green-400 block mb-1">
                            Notes
                          </Label>
                          <p className="text-sm">
                            {prescription.notes || 'No additional notes'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
                  No prescriptions recorded
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={onClose} className="gap-2">
              <X className="h-4 w-4" />
              Close Record
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
