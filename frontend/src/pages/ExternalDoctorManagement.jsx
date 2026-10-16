import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/useAuth';
import { externalDoctorService } from '../services/service';

export default function ExternalDoctorManagement() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingExpired, setCheckingExpired] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [dialogAction, setDialogAction] = useState('');
  const { user } = useAuth();

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await externalDoctorService.getRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Erreur lors du chargement', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadRequests = async () => {
      await fetchRequests();
    };

    loadRequests();
  }, []);

  const handleCheckExpired = async () => {
    try {
      setCheckingExpired(true);
      const data = await externalDoctorService.checkExpiredAccounts();

      if (data.expiredAccounts && data.expiredAccounts.length > 0) {
        toast.success('Comptes Expirés Détectés', {
          description: `${data.deactivatedCount || 0} compte(s) ont été désactivé(s). ${data.expiredAccounts.length} compte(s) étaient expiré(s).`,
        });
      } else {
        toast.success('Vérification Complétée', {
          description: 'Aucun compte expiré détecté.',
        });
      }

      fetchRequests();
    } catch (error) {
      toast.error('Erreur', {
        description: error.message,
      });
    } finally {
      setCheckingExpired(false);
    }
  };

  const openApproveDialog = (request) => {
    if (request.status !== 'pending') {
      toast.error('Action Impossible', {
        description: 'Cette demande a déjà été traitée',
      });
      fetchRequests();
      return;
    }

    setSelectedRequest(request);
    setDialogAction('approve');
    setRejectionReason('');
    setReviewDialogOpen(true);
  };

  const openRejectDialog = (request) => {
    if (request.status !== 'pending') {
      toast.error('Action Impossible', {
        description: 'Cette demande a déjà été traitée',
      });
      fetchRequests();
      return;
    }

    setSelectedRequest(request);
    setDialogAction('reject');
    setRejectionReason('');
    setReviewDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    await reviewRequest(true);
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    if (!rejectionReason.trim()) {
      toast.error('Erreur', {
        description: 'Une raison de rejet est requise',
      });
      return;
    }
    await reviewRequest(false);
  };

  const reviewRequest = async (approved) => {
    try {
      setReviewLoading(true);

      if (selectedRequest.status !== 'pending') {
        toast.error('Erreur', {
          description: 'Cette demande a déjà été traitée',
        });
        setReviewDialogOpen(false);
        fetchRequests();
        return;
      }

      let result;
      try {
        result = await externalDoctorService.reviewRequest(selectedRequest.id, {
          approved,
          rejectionReason: !approved ? rejectionReason : undefined,
        });
      } catch (error) {
        const status = error.status;
        switch (status) {
          case 409:
            throw new Error(
              'Cette demande a déjà été traitée par un autre administrateur',
            );
          case 404:
            throw new Error('Demande introuvable');
          case 403:
            throw new Error("Vous n'avez pas les permissions nécessaires");
          case 401:
            throw new Error('Session expirée, veuillez vous reconnecter');
          default:
            throw new Error(error.message);
        }
      }

      setRequests((prev) =>
        prev.map((req) =>
          req.id === selectedRequest.id
            ? {
                ...req,
                status: approved ? 'approved' : 'rejected',
                rejectionReason: !approved ? rejectionReason : undefined,
                reviewedAt: new Date().toISOString(),
                reviewedBy: user.id,
              }
            : req,
        ),
      );

      toast.success('Succès', {
        description: approved
          ? 'Demande approuvée avec succès. Un email a été envoyé au médecin.'
          : 'Demande rejetée avec succès. Un email a été envoyé au médecin.',
      });

      setReviewDialogOpen(false);
      setRejectionReason('');
      setSelectedRequest(null);
      setDialogAction('');

      setTimeout(() => {
        fetchRequests();
      }, 1000);

      return result;
    } catch (error) {
      toast.error('Erreur lors du traitement', {
        description: error.message,
        duration: 5000,
      });

      fetchRequests();
    } finally {
      setReviewLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            En attente
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approuvée
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Rejetée
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800">
            <Clock className="w-3 h-3 mr-1" />
            {status || 'Inconnu'}
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Demandes de Médecins Externes</h1>
          <p className="text-gray-600 mt-2">
            Gérez les demandes d'accès des médecins externes
          </p>
        </div>
        <Button
          onClick={fetchRequests}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Actualiser
        </Button>
      </div>

      {requests.length === 0 ? (
        <Alert>
          <AlertDescription>
            Aucune demande de médecin externe pour le moment.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4">
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" className="text-sm">
              En attente ({requests.filter((r) => r.status === 'pending').length}
              )
            </Button>
            <Button variant="outline" className="text-sm">
              Approuvées (
              {requests.filter((r) => r.status === 'approved').length})
            </Button>
            <Button variant="outline" className="text-sm">
              Rejetées ({requests.filter((r) => r.status === 'rejected').length})
            </Button>
            <Button
              onClick={handleCheckExpired}
              disabled={checkingExpired}
              className="ml-auto bg-blue-600 hover:bg-blue-700 text-sm"
            >
              {checkingExpired ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Vérification...
                </>
              ) : (
                'Vérifier les comptes expirés'
              )}
            </Button>
          </div>

          {requests.map((request) => (
            <Card key={request.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {request.firstName} {request.lastName}
                    </CardTitle>
                    <CardDescription>{request.email}</CardDescription>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 font-semibold">Phone Number</p>
                    <p>{request.phoneNumber || 'Non fourni'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-semibold">
                      Specialization
                    </p>
                    <p>{request.specialization || 'Non spécifiée'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-semibold">Institution</p>
                    <p>{request.institution || 'Non spécifiée'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-semibold">
                      License Number
                    </p>
                    <p>{request.licenseNumber || 'Non fourni'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-semibold">Demande Date</p>
                    <p>
                      {new Date(request.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-semibold">Patient</p>
                    <p>{request.requestedPatientNames || 'No Patient'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-semibold">
                      Reason For Access
                    </p>
                    <p>{request.reasonForAccess || 'No Patient'}</p>
                  </div>
                </div>

                {request.status === 'rejected' && request.rejectionReason && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-800">
                      <strong>Raison du rejet:</strong>{' '}
                      {request.rejectionReason}
                    </AlertDescription>
                  </Alert>
                )}

                {request.status === 'approved' && request.accountExpiresAt && (
                  <Alert className="border-green-200 bg-green-50">
                    <AlertDescription className="text-green-800">
                      <strong>Compte créé:</strong> Expire le{' '}
                      {new Date(request.accountExpiresAt).toLocaleDateString(
                        'fr-FR',
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {request.status === 'pending' && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => openApproveDialog(request)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      disabled={reviewLoading}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approuver
                    </Button>
                    <Button
                      onClick={() => openRejectDialog(request)}
                      variant="destructive"
                      className="flex-1"
                      disabled={reviewLoading}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Rejeter
                    </Button>
                  </div>
                )}

                {request.status !== 'pending' && request.reviewedAt && (
                  <div className="text-xs text-gray-500 mt-2">
                    Traité le{' '}
                    {new Date(request.reviewedAt).toLocaleDateString('fr-FR')} à{' '}
                    {new Date(request.reviewedAt).toLocaleTimeString('fr-FR')}
                    {request.reviewedBy && ` par ${request.reviewedBy}`}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction === 'approve'
                ? 'Approuver la Demande'
                : 'Rejeter la Demande'}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest &&
                `Dr. ${selectedRequest.firstName} ${selectedRequest.lastName}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {dialogAction === 'approve' ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">
                    Confirmation d'Approbation
                  </span>
                </div>
                <p className="text-sm text-green-600">
                  Êtes-vous sûr de vouloir approuver cette demande? Un compte
                  temporaire sera créé pour ce médecin avec accès aux systèmes
                  hospitaliers.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700 mb-1">
                    <XCircle className="w-4 h-4" />
                    <span className="font-semibold text-sm">
                      Rejet de la Demande
                    </span>
                  </div>
                  <p className="text-xs text-red-600">
                    Veuillez fournir une raison claire pour le rejet.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-red-600">
                    Raison du rejet *
                  </label>
                  <Textarea
                    placeholder="Expliquez pourquoi cette demande est rejetée (ex: informations insuffisantes, non-conformité, etc.)..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    disabled={reviewLoading}
                    className="border-red-200 focus:border-red-400"
                    rows={4}
                  />
                  {rejectionReason.trim() === '' && (
                    <p className="text-xs text-red-500">
                      Une raison de rejet est obligatoire
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReviewDialogOpen(false);
                setRejectionReason('');
                setSelectedRequest(null);
                setDialogAction('');
              }}
              disabled={reviewLoading}
            >
              Annuler
            </Button>

            {dialogAction === 'approve' ? (
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleApprove}
                disabled={reviewLoading}
              >
                {reviewLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Approbation...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirmer l'Approbation
                  </>
                )}
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={reviewLoading || !rejectionReason.trim()}
              >
                {reviewLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Rejet...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Confirmer le Rejet
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
