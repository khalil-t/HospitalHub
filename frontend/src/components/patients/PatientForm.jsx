import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

export const PatientForm = ({
  formData,
  onFieldChange,
  services = [],
  isLoading = false,
  isSubmitting = false,
  onSubmit,
  submitLabel = 'Submit Admission Request',
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <label className="text-sm font-semibold text-foreground">
            First Name *
          </label>
          <Input
            placeholder="John"
            value={formData.firstName}
            onChange={(e) => onFieldChange('firstName', e.target.value)}
            className="bg-background border-border/50 text-foreground"
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold text-foreground">
            Last Name *
          </label>
          <Input
            placeholder="Smith"
            value={formData.lastName}
            onChange={(e) => onFieldChange('lastName', e.target.value)}
            className="bg-background border-border/50 text-foreground"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-3">
          <label className="text-sm font-semibold text-foreground">
            Date of Birth *
          </label>
          <Input
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => onFieldChange('dateOfBirth', e.target.value)}
            className="bg-background border-border/50 text-foreground"
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold text-foreground">Gender</label>
          <select
            value={formData.gender}
            onChange={(e) => onFieldChange('gender', e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border/50 rounded-md text-foreground"
          >
            <option value="">Select gender</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <label className="text-sm font-semibold text-foreground">
            Contact Phone
          </label>
          <Input
            placeholder="+1 (555) 123-4567"
            value={formData.contactPhone}
            onChange={(e) => onFieldChange('contactPhone', e.target.value)}
            className="bg-background border-border/50 text-foreground"
          />
        </div>
        <div className="space-y-3">
          <label className="text-sm font-semibold text-foreground">
            National Number
          </label>
          <Input
            placeholder="e.g. 12345678901234"
            value={formData.nationalNumber}
            onChange={(e) => onFieldChange('nationalNumber', e.target.value)}
            className="bg-background border-border/50 text-foreground"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <label className="text-sm font-semibold text-foreground">
            Insurance Number
          </label>
          <Input
            placeholder="e.g. 12345678901234"
            value={formData.insuranceNumber}
            onChange={(e) => onFieldChange('insuranceNumber', e.target.value)}
            className="bg-background border-border/50 text-foreground"
          />
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-semibold text-foreground">
          Requested Service *
        </label>
        <select
          value={formData.requestedService}
          onChange={(e) => onFieldChange('requestedService', e.target.value)}
          className="w-full px-3 py-2 bg-background border border-border/50 rounded-md text-foreground"
          disabled={isLoading}
        >
          <option value="">Select service...</option>
          {services.map((service) => (
            <option key={service.id} value={service.code}>
              {service.name}
            </option>
          ))}
        </select>
        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading services...</p>
        )}
      </div>

      <Button
        onClick={onSubmit}
        disabled={isSubmitting}
        className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            Creating Patient...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            {submitLabel}
          </>
        )}
      </Button>
    </div>
  );
};

export default PatientForm;
