import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { User, Send, Eye, Plus, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/useAuth';

const RadiologistDashboard = () => {
  const [activeTab, setActiveTab] = useState('addImaging');
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [imagingForm, setImagingForm] = useState({
    medicalRecordId: '',
    patientName: '',
    modality: '',
    report: '',
    fileRef: '',
    performedAt: new Date().toISOString().split('T')[0] + 'T00:00',
  });

  const [submittedImaging, setSubmittedImaging] = useState([]);

  const modalities = [
    'CT',
    'MRI',
    'XRAY',
    'Ultrasound',
    'PET',
    'Mammography',
    'Fluoroscopy',
    'Angiography',
  ];

  const handleSubmitImaging = () => {
    if (
      !imagingForm.medicalRecordId ||
      !imagingForm.modality ||
      !imagingForm.patientName
    ) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newImaging = {
      id: Date.now(),
      ...imagingForm,
      submittedAt: new Date().toLocaleString(),
      createdAt: new Date().toLocaleDateString(),
    };

    setSubmittedImaging([newImaging, ...submittedImaging]);

    toast.success(
      `Imaging report for ${imagingForm.patientName} submitted successfully`,
      {
        description: `Modality: ${imagingForm.modality}`,
      },
    );

    setImagingForm({
      medicalRecordId: '',
      patientName: '',
      modality: '',
      report: '',
      fileRef: '',
      performedAt: new Date().toISOString().split('T')[0] + 'T00:00',
    });
  };

  const getModalityBadge = (modality) => {
    const modalityColors = {
      CT: 'bg-blue-500/20 text-blue-500 border-blue-500/20',
      MRI: 'bg-purple-500/20 text-purple-500 border-purple-500/20',
      XRAY: 'bg-green-500/20 text-green-500 border-green-500/20',
      Ultrasound: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/20',
      PET: 'bg-red-500/20 text-red-500 border-red-500/20',
      Mammography: 'bg-pink-500/20 text-pink-500 border-pink-500/20',
      Fluoroscopy: 'bg-cyan-500/20 text-cyan-500 border-cyan-500/20',
      Angiography: 'bg-orange-500/20 text-orange-500 border-orange-500/20',
    };

    const color =
      modalityColors[modality] || 'bg-gray-500/20 text-gray-500 border-gray-500/20';

    return <Badge className={color}>{modality}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-purple-50/20 dark:to-purple-950/20 p-4 md:p-6">
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
                  Radiologist Portal
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            <div className="text-right">
              <p className="font-semibold text-foreground">Dr. Michael Chen</p>
              <p className="text-sm text-muted-foreground">Radiologist</p>
            </div>
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              className="border-border/50 bg-card/50 backdrop-blur-sm hover:bg-secondary/50 transition-all duration-200"
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
            >
              <User className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="bg-secondary/30 backdrop-blur-sm border border-border/50 p-1 rounded-xl">
            <TabsTrigger
              value="addImaging"
              className="data-[state=active]:bg-green-500 data-[state=active]:text-white rounded-lg transition-all duration-200"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Imaging
            </TabsTrigger>
            <TabsTrigger
              value="myImaging"
              className="data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-lg transition-all duration-200"
            >
              <Eye className="mr-2 h-4 w-4" />
              My Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="addImaging" className="space-y-6">
            <div className="flex justify-center">
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm w-full max-w-4xl">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl font-bold text-foreground">
                    Add Imaging Report
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Submit radiology imaging reports and findings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-foreground">
                          Medical Record ID *
                        </label>
                        <Input
                          placeholder="Enter medical record ID..."
                          value={imagingForm.medicalRecordId}
                          onChange={(e) =>
                            setImagingForm({
                              ...imagingForm,
                              medicalRecordId: e.target.value,
                            })
                          }
                          className="bg-background border-border/50 text-foreground"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-foreground">
                          Patient Name *
                        </label>
                        <Input
                          placeholder="Enter patient name..."
                          value={imagingForm.patientName}
                          onChange={(e) =>
                            setImagingForm({
                              ...imagingForm,
                              patientName: e.target.value,
                            })
                          }
                          className="bg-background border-border/50 text-foreground"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-foreground">
                          Imaging Modality *
                        </label>
                        <select
                          value={imagingForm.modality}
                          onChange={(e) =>
                            setImagingForm({
                              ...imagingForm,
                              modality: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 bg-background border border-border/50 rounded-md text-foreground"
                        >
                          <option value="">Select modality...</option>
                          {modalities.map((modality) => (
                            <option key={modality} value={modality}>
                              {modality}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-foreground">
                          Performed At
                        </label>
                        <Input
                          type="datetime-local"
                          value={imagingForm.performedAt}
                          onChange={(e) =>
                            setImagingForm({
                              ...imagingForm,
                              performedAt: e.target.value,
                            })
                          }
                          className="bg-background border-border/50 text-foreground"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-foreground">
                        File Reference (MinIO Object Key)
                      </label>
                      <Input
                        placeholder="Enter MinIO object key or file reference..."
                        value={imagingForm.fileRef}
                        onChange={(e) =>
                          setImagingForm({
                            ...imagingForm,
                            fileRef: e.target.value,
                          })
                        }
                        className="bg-background border-border/50 text-foreground"
                      />
                      <p className="text-xs text-muted-foreground">
                        e.g., images/patient-123/ct-scan-2024-01.dcm
                      </p>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-foreground">
                        Radiology Report
                      </label>
                      <Textarea
                        placeholder="Enter detailed radiology findings and report..."
                        value={imagingForm.report}
                        onChange={(e) =>
                          setImagingForm({
                            ...imagingForm,
                            report: e.target.value,
                          })
                        }
                        className="bg-background border-border/50 text-foreground min-h-48 resize-none"
                        rows={8}
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                      <Button
                        onClick={handleSubmitImaging}
                        className="flex-1 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        <Send className="mr-2 h-4 w-4" />
                        Submit Imaging Report
                      </Button>
                      <Button
                        variant="outline"
                        className="border-border/50"
                        onClick={() => {
                          setImagingForm({
                            medicalRecordId: '',
                            patientName: '',
                            modality: '',
                            report: '',
                            fileRef: '',
                            performedAt:
                              new Date().toISOString().split('T')[0] + 'T00:00',
                          });
                        }}
                      >
                        Clear Form
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="myImaging" className="space-y-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl font-bold text-foreground">
                      My Imaging Reports
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Radiology reports you have submitted
                    </CardDescription>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total: {submittedImaging.length} reports
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {submittedImaging.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mx-auto w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
                      <Eye className="h-8 w-8 text-purple-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No Reports Submitted Yet
                    </h3>
                    <p className="text-muted-foreground">
                      Submit your first imaging report to see it here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {submittedImaging.map((imaging) => (
                      <div
                        key={imaging.id}
                        className="p-4 rounded-lg border border-border/50 bg-background/50 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 transition-all duration-200"
                      >
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-foreground">
                                {imaging.patientName}
                              </h3>
                              {getModalityBadge(imaging.modality)}
                              <Badge variant="outline" className="text-xs">
                                {imaging.medicalRecordId}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  Modality
                                </p>
                                <p className="font-medium">{imaging.modality}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  Performed At
                                </p>
                                <p className="font-medium">
                                  {new Date(
                                    imaging.performedAt,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  Submitted
                                </p>
                                <p className="font-medium">
                                  {imaging.submittedAt}
                                </p>
                              </div>
                            </div>

                            {imaging.fileRef && (
                              <div className="mb-3">
                                <p className="text-sm text-muted-foreground mb-1">
                                  File Reference:
                                </p>
                                <code className="text-xs bg-background px-2 py-1 rounded border border-border/50">
                                  {imaging.fileRef}
                                </code>
                              </div>
                            )}

                            {imaging.report && (
                              <div>
                                <p className="text-sm font-semibold text-foreground mb-2">
                                  Report:
                                </p>
                                <div className="p-3 rounded-lg bg-background/50 border border-border/30">
                                  <p className="text-sm whitespace-pre-wrap">
                                    {imaging.report}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RadiologistDashboard;
