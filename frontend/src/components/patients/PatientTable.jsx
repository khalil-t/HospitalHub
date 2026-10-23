import { Building2, Eye, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const patientColumns = [
  { key: 'firstName', header: 'First Name' },
  { key: 'lastName', header: 'Last Name' },
];

export const PatientTable = ({
  patients,
  onViewDetails,
  onEdit,
  onDelete,
  onManageServices,
}) => {
  const hasActions = Boolean(
    onViewDetails || onEdit || onDelete || onManageServices,
  );

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {patientColumns.map((column) => (
              <TableHead key={column.key}>{column.header}</TableHead>
            ))}
            {hasActions && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.map((patient) => (
            <TableRow key={patient.id} className="hover:bg-secondary/50">
              {patientColumns.map((column) => (
                <TableCell key={column.key}>{patient[column.key]}</TableCell>
              ))}
              {hasActions && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {onViewDetails && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewDetails(patient)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View details
                      </Button>
                    )}
                    {onEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={`Edit ${patient.firstName} ${patient.lastName}`}
                        onClick={() => onEdit(patient)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {onManageServices && (
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={`Manage services for ${patient.firstName} ${patient.lastName}`}
                        onClick={() => onManageServices(patient)}
                      >
                        <Building2 className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="destructive"
                        size="sm"
                        aria-label={`Delete ${patient.firstName} ${patient.lastName}`}
                        onClick={() => onDelete(patient)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default PatientTable;
