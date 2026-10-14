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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Stethoscope, Trash2, Edit, Save, Plus } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL;

const loadServices = async () => {
  const res = await fetch(`${API_URL}/services`);
  if (!res.ok) {
    return { ok: false, data: null };
  }
  return { ok: true, data: await res.json() };
};

const ServicesManagement = () => {
  const [services, setServices] = useState([]);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    code: '',
    description: '',
  });

  const fetchServices = async () => {
    try {
      const result = await loadServices();
      if (result.ok) {
        setServices(result.data);
      } else {
        toast.error('Failed to fetch services');
      }
    } catch {
      toast.error('Network error fetching services');
    }
  };

  useEffect(() => {
    let active = true;
    loadServices()
      .then((result) => {
        if (!active) return;
        if (result.ok) {
          setServices(result.data);
        } else {
          toast.error('Failed to fetch services');
        }
      })
      .catch(() => {
        if (active) {
          toast.error('Network error fetching services');
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const openServiceModal = (service = null) => {
    setEditingItem(service);
    if (service) {
      setServiceForm({
        name: service.name || '',
        code: service.code || '',
        description: service.description || '',
      });
    } else {
      setServiceForm({
        name: '',
        code: '',
        description: '',
      });
    }

    setIsServiceModalOpen(true);
  };

  const handleServiceSubmit = async (e) => {
    e.preventDefault();

    if (!serviceForm.name || !serviceForm.code) {
      toast.error('Please fill in required fields (Name and Code)');
      return;
    }

    try {
      const payload = {
        name: serviceForm.name,
        code: serviceForm.code.toUpperCase(),
        description: serviceForm.description,
      };

      const url = editingItem
        ? `${API_URL}/services/${editingItem.id}`
        : `${API_URL}/services`;

      const method = editingItem ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.message || `Error: ${response.status}`);
        return;
      }

      toast.success(
        editingItem ? 'Service updated successfully' : 'Service created successfully',
      );

      await fetchServices();
      closeModal();
    } catch (err) {
      toast.error(err.message || 'Network error - check if backend is running');
    }
  };

  const deleteService = async (serviceId) => {
    if (!confirm('Are you sure you want to delete this service?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/services/${serviceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.message || `Failed to delete service`);
        return;
      }

      setServices(services.filter((service) => service.id !== serviceId));
      toast.success('Service deleted successfully');
    } catch (err) {
      toast.error(err.message || 'Something went wrong');
    }
  };

  const closeModal = () => {
    setIsServiceModalOpen(false);
    setEditingItem(null);
    setServiceForm({
      name: '',
      code: '',
      description: '',
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">
                Services Management
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Manage hospital service departments
              </CardDescription>
            </div>
            <Button
              className="bg-green-500 text-white"
              onClick={() => openServiceModal()}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Service
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <Card
                key={service.id}
                className="border-border/50 bg-background/50 hover:shadow-lg transition-all duration-300"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold text-foreground">
                        {service.name}
                      </CardTitle>
                      <Badge variant="outline" className="mt-1">
                        {service.code}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openServiceModal(service)}
                        className="text-primary hover:bg-primary/10 h-8 w-8"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteService(service.id)}
                        className="text-red-500 hover:bg-red-100 h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {service.description || 'No description available'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {services.length === 0 && (
            <div className="text-center py-12">
              <Stethoscope className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No Services Found
              </h3>
              <p className="text-muted-foreground mb-4">
                Create your first hospital service to get started
              </p>
              <Button
                className="bg-green-500 text-white"
                onClick={() => openServiceModal()}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add First Service
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isServiceModalOpen} onOpenChange={setIsServiceModalOpen}>
        <DialogContent className="bg-background border-border/50 max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Service' : 'Add New Service'}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? 'Update service information'
                : 'Create a new hospital service department'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleServiceSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="serviceName">Service Name *</Label>
                <Input
                  id="serviceName"
                  value={serviceForm.name}
                  onChange={(e) =>
                    setServiceForm({ ...serviceForm, name: e.target.value })
                  }
                  placeholder="e.g., Cardiology, Emergency, Surgery"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serviceCode">Service Code *</Label>
                <Input
                  id="serviceCode"
                  value={serviceForm.code}
                  onChange={(e) =>
                    setServiceForm({
                      ...serviceForm,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="e.g., CARD, EMRG, SURG"
                  maxLength={10}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Short code for identification (will be converted to uppercase)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceDescription">Description</Label>
              <Textarea
                id="serviceDescription"
                value={serviceForm.description}
                onChange={(e) =>
                  setServiceForm({
                    ...serviceForm,
                    description: e.target.value,
                  })
                }
                placeholder="Describe the service department and its responsibilities"
                rows={3}
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> Common services include Cardiology,
                Emergency, Surgery, Pediatrics, Radiology, Laboratory, Pharmacy,
                etc.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" className="bg-green-500 text-white">
                <Save className="mr-2 h-4 w-4" />
                {editingItem ? 'Update Service' : 'Create Service'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServicesManagement;
