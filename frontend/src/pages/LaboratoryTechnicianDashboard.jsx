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
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { User, Stethoscope, Plus, Send, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/useAuth';

const LaboratoryTechnicianDashboard = () => {
  const [activeTab, setActiveTab] = useState('addResults');
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [labResultForm, setLabResultForm] = useState({
    medicalRecordId: '',
    patientName: '',
    testName: '',
    resultDate: new Date().toISOString().split('T')[0],
    result: {},
  });
  const [additionalResult, setAdditionalResult] = useState({
    key: '',
    value: '',
    unit: '',
    referenceRange: '',
    flag: 'normal',
  });

  const [submittedResults, setSubmittedResults] = useState([]);

  const availableTests = [
    'Complete Blood Count',
    'Blood Glucose Test',
    'Lipid Panel',
    'Liver Function Tests',
    'Kidney Function Test',
    'Thyroid Panel',
    'Coagulation Profile',
    'Electrolyte Panel',
    'Urinalysis',
  ];

  const handleAddResultField = () => {
    if (!additionalResult.key || !additionalResult.value) {
      toast.error('Please enter both key and value');
      return;
    }

    const newResult = {
      ...labResultForm.result,
      [additionalResult.key]: {
        value: additionalResult.value,
        unit: additionalResult.unit || '',
        referenceRange: additionalResult.referenceRange || '',
        flag: additionalResult.flag,
      },
    };

    setLabResultForm({
      ...labResultForm,
      result: newResult,
    });

    setAdditionalResult({
      key: '',
      value: '',
      unit: '',
      referenceRange: '',
      flag: 'normal',
    });

    toast.success('Test parameter added');
  };

  const handleSubmitLabResults = () => {
    if (
      !labResultForm.medicalRecordId ||
      !labResultForm.testName ||
      !labResultForm.patientName
    ) {
      toast.error('Please fill in all required fields');
      return;
    }

    const hasResults = Object.keys(labResultForm.result).length > 0;
    if (!hasResults) {
      toast.error('Please enter at least one test result');
      return;
    }

    const newResult = {
      id: Date.now(),
      ...labResultForm,
      submittedDate: new Date().toLocaleString(),
    };

    setSubmittedResults([newResult, ...submittedResults]);

    toast.success(
      `Lab results for ${labResultForm.patientName} submitted successfully`,
      {
        description: `Test: ${labResultForm.testName}`,
      },
    );

    setLabResultForm({
      medicalRecordId: '',
      patientName: '',
      testName: '',
      resultDate: new Date().toISOString().split('T')[0],
      result: {},
    });
  };

  const getFlagBadge = (flag) => {
    const flagConfig = {
      normal: { className: 'bg-green-500/20 text-green-500 border-green-500/20' },
      high: { className: 'bg-red-500/20 text-red-500 border-red-500/20' },
      low: { className: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/20' },
    };

    const config = flagConfig[flag] || flagConfig['normal'];

    return (
      <Badge className={`px-2 py-0.5 text-xs ${config.className}`}>
        {flag}
      </Badge>
    );
  };

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
                  Laboratory Technician Portal
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            <div className="text-right">
              <p className="font-semibold text-foreground">Alex Rodriguez</p>
              <p className="text-sm text-muted-foreground">Lab Technician</p>
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
              value="addResults"
              className="data-[state=active]:bg-green-500 data-[state=active]:text-white rounded-lg transition-all duration-200"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Results
            </TabsTrigger>
            <TabsTrigger
              value="myResults"
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg transition-all duration-200"
            >
              <Eye className="mr-2 h-4 w-4" />
              My Results
            </TabsTrigger>
          </TabsList>

          <TabsContent value="addResults" className="space-y-6">
            <div className="flex justify-center">
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm w-full max-w-4xl">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl font-bold text-foreground">
                    Add Laboratory Test Results
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Enter laboratory test results for patient medical records
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
                          value={labResultForm.medicalRecordId}
                          onChange={(e) =>
                            setLabResultForm({
                              ...labResultForm,
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
                          value={labResultForm.patientName}
                          onChange={(e) =>
                            setLabResultForm({
                              ...labResultForm,
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
                          Test Name *
                        </label>
                        <select
                          value={labResultForm.testName}
                          onChange={(e) =>
                            setLabResultForm({
                              ...labResultForm,
                              testName: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 bg-background border border-border/50 rounded-md text-foreground"
                        >
                          <option value="">Select test...</option>
                          {availableTests.map((test) => (
                            <option key={test} value={test}>
                              {test}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-foreground">
                          Result Date
                        </label>
                        <Input
                          type="date"
                          value={labResultForm.resultDate}
                          onChange={(e) =>
                            setLabResultForm({
                              ...labResultForm,
                              resultDate: e.target.value,
                            })
                          }
                          className="bg-background border-border/50 text-foreground"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-foreground">
                        Test Parameters
                      </h3>

                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                          <Input
                            placeholder="Parameter (e.g., glucose)"
                            value={additionalResult.key}
                            onChange={(e) =>
                              setAdditionalResult({
                                ...additionalResult,
                                key: e.target.value,
                              })
                            }
                            className="bg-background border-border/50 text-foreground"
                          />
                          <Input
                            placeholder="Value"
                            value={additionalResult.value}
                            onChange={(e) =>
                              setAdditionalResult({
                                ...additionalResult,
                                value: e.target.value,
                              })
                            }
                            className="bg-background border-border/50 text-foreground"
                          />
                          <Input
                            placeholder="Unit (e.g., mg/dL)"
                            value={additionalResult.unit}
                            onChange={(e) =>
                              setAdditionalResult({
                                ...additionalResult,
                                unit: e.target.value,
                              })
                            }
                            className="bg-background border-border/50 text-foreground"
                          />
                          <Input
                            placeholder="Reference Range"
                            value={additionalResult.referenceRange}
                            onChange={(e) =>
                              setAdditionalResult({
                                ...additionalResult,
                                referenceRange: e.target.value,
                              })
                            }
                            className="bg-background border-border/50 text-foreground"
                          />
                          <select
                            value={additionalResult.flag}
                            onChange={(e) =>
                              setAdditionalResult({
                                ...additionalResult,
                                flag: e.target.value,
                              })
                            }
                            className="px-3 py-2 bg-background border border-border/50 rounded-md text-foreground"
                          >
                            <option value="normal">Normal</option>
                            <option value="high">High</option>
                            <option value="low">Low</option>
                          </select>
                        </div>
                        <Button
                          onClick={handleAddResultField}
                          variant="outline"
                          className="w-full border-border/50"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Test Parameter
                        </Button>
                      </div>

                      {Object.keys(labResultForm.result).length > 0 && (
                        <div className="space-y-3 pt-4">
                          <h4 className="font-semibold text-foreground">
                            Added Parameters:
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Object.entries(labResultForm.result).map(
                              ([key, data]) => (
                                <div
                                  key={key}
                                  className="p-3 rounded-lg border border-border/50 bg-background/50"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium capitalize">
                                      {key}
                                    </span>
                                    {getFlagBadge(data.flag)}
                                  </div>
                                  <div className="mt-2 text-sm space-y-1">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">
                                        Value:
                                      </span>
                                      <span className="font-semibold">
                                        {data.value} {data.unit}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">
                                        Reference:
                                      </span>
                                      <span>{data.referenceRange}</span>
                                    </div>
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                      <Button
                        onClick={handleSubmitLabResults}
                        className="flex-1 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        <Send className="mr-2 h-4 w-4" />
                        Submit Lab Results
                      </Button>
                      <Button
                        variant="outline"
                        className="border-border/50"
                        onClick={() => {
                          setLabResultForm({
                            medicalRecordId: '',
                            patientName: '',
                            testName: '',
                            resultDate: new Date().toISOString().split('T')[0],
                            result: {},
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

          <TabsContent value="myResults" className="space-y-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl font-bold text-foreground">
                      My Submitted Results
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Laboratory test results you have submitted
                    </CardDescription>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total: {submittedResults.length} results
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {submittedResults.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mx-auto w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                      <Eye className="h-8 w-8 text-blue-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No Results Submitted Yet
                    </h3>
                    <p className="text-muted-foreground">
                      Submit your first lab results to see them here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {submittedResults.map((result) => (
                      <div
                        key={result.id}
                        className="p-4 rounded-lg border border-border/50 bg-background/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all duration-200"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-foreground">
                                {result.patientName}
                              </h3>
                              <Badge variant="outline" className="text-xs">
                                {result.medicalRecordId}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  Test
                                </p>
                                <p className="font-medium">{result.testName}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  Result Date
                                </p>
                                <p className="font-medium">
                                  {result.resultDate}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  Submitted
                                </p>
                                <p className="font-medium">
                                  {result.submittedDate}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4">
                              <h4 className="text-sm font-semibold text-foreground mb-2">
                                Test Parameters:
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {Object.entries(result.result).map(
                                  ([key, data]) => (
                                    <div
                                      key={key}
                                      className="p-2 rounded border border-border/30 bg-background/30"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium capitalize">
                                          {key}
                                        </span>
                                        {getFlagBadge(data.flag)}
                                      </div>
                                      <div className="text-sm mt-1">
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">
                                            Value:
                                          </span>
                                          <span className="font-semibold">
                                            {data.value} {data.unit}
                                          </span>
                                        </div>
                                        {data.referenceRange && (
                                          <div className="text-xs text-muted-foreground">
                                            Ref: {data.referenceRange}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>
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

export default LaboratoryTechnicianDashboard;
