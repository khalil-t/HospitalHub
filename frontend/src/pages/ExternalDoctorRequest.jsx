import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { CheckCircle, Send } from 'lucide-react';
import { externalDoctorService } from '../services/service';

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  specialization: '',
  licenseNumber: '',
};

export default function ExternalDoctorRequest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await externalDoctorService.createRequest(formData);

      setSuccess(true);
      toast.success(
        `Demande soumise avec succès pour Dr. ${formData.firstName} ${formData.lastName}`,
        {
          description:
            "Votre demande a été envoyée à l'administration pour examen.",
        },
      );
    } catch (err) {
      setError(err.message);
      toast.error('Erreur lors de la soumission', {
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setSuccess(false);
    setError('');
  };

  if (success) {
    return (
      <div className="space-y-6">
        <Card className="border-green-200 bg-green-50/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <CardTitle className="text-green-700">
                  Demande Soumise avec Succès!
                </CardTitle>
                <CardDescription className="text-green-600">
                  Votre demande d'accès médecin externe a été envoyée
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700">
                <strong>
                  Dr. {formData.firstName} {formData.lastName}
                </strong>{' '}
                - Votre demande a été soumise avec succès.
                <br />
                L'administrateur examinera votre demande et vous enverra une
                réponse par email à: <strong>{formData.email}</strong>
                <br />
                <span className="text-sm text-green-600 mt-2 block">
                  Vous recevrez une notification dans les prochaines 24-48
                  heures.
                </span>
              </AlertDescription>
            </Alert>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={resetForm}
                variant="outline"
                className="flex-1 border-green-200 text-green-700 hover:bg-green-50"
              >
                Nouvelle Demande
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground">
            Demande d'Accès - Médecin Externe
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Veuillez remplir le formulaire ci-dessous pour demander un accès
            temporaire à la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="firstName"
                  className="text-sm font-semibold text-foreground"
                >
                  Prénom *
                </Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  placeholder="Prénom"
                  disabled={loading}
                  className="bg-background border-border/50 text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="lastName"
                  className="text-sm font-semibold text-foreground"
                >
                  Nom *
                </Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  placeholder="Nom"
                  disabled={loading}
                  className="bg-background border-border/50 text-foreground"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-semibold text-foreground"
              >
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="prenom.nom@example.com"
                disabled={loading}
                className="bg-background border-border/50 text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="phoneNumber"
                className="text-sm font-semibold text-foreground"
              >
                Téléphone
              </Label>
              <Input
                id="phoneNumber"
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="+213 6 12 34 56 78"
                disabled={loading}
                className="bg-background border-border/50 text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="specialization"
                className="text-sm font-semibold text-foreground"
              >
                Spécialité Médicale
              </Label>
              <Input
                id="specialization"
                name="specialization"
                value={formData.specialization}
                onChange={handleChange}
                placeholder="Cardiologie, Orthopédie, etc."
                disabled={loading}
                className="bg-background border-border/50 text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="licenseNumber"
                className="text-sm font-semibold text-foreground"
              >
                Numéro de Licence Médicale
              </Label>
              <Input
                id="licenseNumber"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleChange}
                placeholder="Votre numéro de licence"
                disabled={loading}
                className="bg-background border-border/50 text-foreground"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Soumettre la Demande
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
