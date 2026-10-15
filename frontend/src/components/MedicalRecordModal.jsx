import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Plus,
  X,
  Pill,
  AlertTriangle,
  FileText,
  User,
  Calendar,
  Stethoscope,
} from 'lucide-react';

const EMPTY_FORM = {
  title: '',
  content: '',
  diagnosis: '',
  allergies: [],
  prescriptions: [],
};

const EMPTY_PRESCRIPTION = {
  name: '',
  dosage: '',
  frequency: '',
  duration: '',
};

export default function MedicalRecordModal({
  isOpen,
  onClose,
  patient,
  medicalRecord,
  onSave,
}) {
  const [form, setForm] = useState(() => {
    if (!medicalRecord) return EMPTY_FORM;
    return {
      ...EMPTY_FORM,
      ...medicalRecord,
      allergies: Array.isArray(medicalRecord.allergies)
        ? medicalRecord.allergies
        : [],
      prescriptions: Array.isArray(medicalRecord.prescriptions)
        ? medicalRecord.prescriptions
        : [],
    };
  });
  const [newAllergy, setNewAllergy] = useState('');
  const [newPrescription, setNewPrescription] = useState(EMPTY_PRESCRIPTION);

  useEffect(() => {
    const syncForm = () => {
      if (medicalRecord) {
        setForm({
          ...EMPTY_FORM,
          ...medicalRecord,
          allergies: Array.isArray(medicalRecord.allergies)
            ? medicalRecord.allergies
            : [],
          prescriptions: Array.isArray(medicalRecord.prescriptions)
            ? medicalRecord.prescriptions
            : [],
        });
      } else {
        setForm(EMPTY_FORM);
      }
    };
    syncForm();
  }, [medicalRecord]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const addAllergy = () => {
    if (newAllergy.trim()) {
      setForm((prev) => ({
        ...prev,
        allergies: [...prev.allergies, newAllergy.trim()],
      }));
      setNewAllergy('');
    }
  };

  const removeAllergy = (index) => {
    setForm((prev) => ({
      ...prev,
      allergies: prev.allergies.filter((_, i) => i !== index),
    }));
  };

  const addPrescription = () => {
    if (newPrescription.name.trim()) {
      setForm((prev) => ({
        ...prev,
        prescriptions: [...prev.prescriptions, { ...newPrescription }],
      }));
      setNewPrescription(EMPTY_PRESCRIPTION);
    }
  };

  const removePrescription = (index) => {
    setForm((prev) => ({
      ...prev,
      prescriptions: prev.prescriptions.filter((_, i) => i !== index),
    }));
  };

  const updatePrescriptionField = (field, value) => {
    setNewPrescription((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <DialogTitle className="text-xl">
              Medical Record for {patient?.firstName} {patient?.lastName}
            </DialogTitle>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>ID: {patient?.id}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>DOB: {patient?.dob || 'N/A'}</span>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Title
                  </Label>
                  <Input
                    value={form.title ?? ''}
                    onChange={(e) => update('title', e.target.value)}
                    placeholder="Record title"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Date
                  </Label>
                  <Input
                    type="date"
                    value={form.date || new Date().toISOString().split('T')[0]}
                    onChange={(e) => update('date', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Stethoscope className="h-5 w-5 text-blue-600" />
                <Label className="text-lg font-semibold">Diagnosis</Label>
              </div>
              <Input
                value={form.diagnosis ?? ''}
                onChange={(e) => update('diagnosis', e.target.value)}
                placeholder="Enter diagnosis"
                className="w-full"
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <Label className="text-lg font-semibold block mb-3">
                Clinical Notes
              </Label>
              <Textarea
                value={form.content ?? ''}
                onChange={(e) => update('content', e.target.value)}
                placeholder="Enter clinical notes, observations, and treatment details..."
                className="min-h-[120px]"
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <Label className="text-lg font-semibold">Allergies</Label>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={newAllergy}
                    onChange={(e) => setNewAllergy(e.target.value)}
                    placeholder="Enter allergy (e.g., Penicillin, Peanuts)"
                    onKeyPress={(e) => e.key === 'Enter' && addAllergy()}
                  />
                  <Button onClick={addAllergy} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>

                {form.allergies?.length > 0 ? (
                  <div className="space-y-2">
                    {form.allergies.map((allergy, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-3 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span>{allergy}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAllergy(index)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-400">
                    No allergies recorded
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Pill className="h-5 w-5 text-green-600" />
                <Label className="text-lg font-semibold">Prescriptions</Label>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 p-4 bg-gray-900/40 rounded-lg border border-gray-700">
                  <div>
                    <Label className="text-sm font-medium">
                      Medication Name
                    </Label>
                    <Input
                      value={newPrescription.name}
                      onChange={(e) =>
                        updatePrescriptionField('name', e.target.value)
                      }
                      placeholder="e.g., Amoxicillin"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Dosage</Label>
                    <Input
                      value={newPrescription.dosage}
                      onChange={(e) =>
                        updatePrescriptionField('dosage', e.target.value)
                      }
                      placeholder="e.g., 500mg"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Frequency</Label>
                    <Input
                      value={newPrescription.frequency}
                      onChange={(e) =>
                        updatePrescriptionField('frequency', e.target.value)
                      }
                      placeholder="e.g., Twice daily"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Duration</Label>
                    <Input
                      value={newPrescription.duration}
                      onChange={(e) =>
                        updatePrescriptionField('duration', e.target.value)
                      }
                      placeholder="e.g., 7 days"
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-2">
                    <Button onClick={addPrescription} className="w-full gap-2">
                      <Plus className="h-4 w-4" />
                      Add Prescription
                    </Button>
                  </div>
                </div>

                {form.prescriptions?.length > 0 ? (
                  <div className="space-y-3">
                    {form.prescriptions.map((prescription, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-lg bg-green-50 text-green-900 dark:bg-green-900/20 dark:text-green-300"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <Pill className="h-4 w-4 text-green-600 dark:text-green-400" />
                            <span className="font-semibold">
                              {prescription.name}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removePrescription(index)}
                            className="h-8 w-8 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Dosage:</span>{' '}
                            {prescription.dosage}
                          </div>
                          <div>
                            <span className="font-medium">Frequency:</span>{' '}
                            {prescription.frequency}
                          </div>
                          <div>
                            <span className="font-medium">Duration:</span>{' '}
                            {prescription.duration}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-400">
                    No prescriptions added
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="gap-2">
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button
              onClick={() => onSave(form)}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <FileText className="h-4 w-4" />
              Save Medical Record
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
