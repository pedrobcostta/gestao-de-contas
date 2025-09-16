import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Permission } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { Label } from "@/components/ui/label";

interface PermissionsGridProps {
  permissions: Permission[];
  onPermissionsChange: (permissions: Permission[]) => void;
  selectedManagement: string;
  onSelectedManagementChange: (management: string) => void;
}

const managements = ['pessoal', 'casa', 'pai', 'mae'];
const tabs = ['contas', 'pix', 'bancos', 'pagas', 'relatorios', 'perfil', 'usuarios'];
const actions = [
  { id: 'read', label: 'Ler' },
  { id: 'write', label: 'Escrever' },
  { id: 'edit', label: 'Editar' },
  { id: 'delete', label: 'Deletar' },
];

export function PermissionsGrid({
  permissions = [],
  onPermissionsChange,
  selectedManagement,
  onSelectedManagementChange,
}: PermissionsGridProps) {
  const isMobile = useIsMobile();

  const updatePermissions = (newPermissions: Permission[]) => {
    onPermissionsChange(newPermissions.filter(p => p.can_read || p.can_write || p.can_edit || p.can_delete));
  };

  const handlePermissionChange = (tab: string, action: string, checked: boolean) => {
    let newPermissions = [...permissions];
    const permIndex = newPermissions.findIndex(p => p.management_type === selectedManagement && p.tab === tab);
    if (permIndex > -1) {
      newPermissions[permIndex][`can_${action}`] = checked;
    } else if (checked) {
      newPermissions.push({
        management_type: selectedManagement, tab,
        can_read: action === 'read' && checked, can_write: action === 'write' && checked,
        can_edit: action === 'edit' && checked, can_delete: action === 'delete' && checked,
      } as Permission);
    }
    updatePermissions(newPermissions);
  };

  const renderDesktop = () => {
    const handleSelectAll = (checked: boolean) => {
      let newPermissions = [...permissions];
      tabs.forEach(tab => {
        const permIndex = newPermissions.findIndex(p => p.management_type === selectedManagement && p.tab === tab);
        if (permIndex > -1) {
          actions.forEach(action => { newPermissions[permIndex][`can_${action.id}`] = checked; });
        } else if (checked) {
          newPermissions.push({ management_type: selectedManagement, tab, can_read: true, can_write: true, can_edit: true, can_delete: true } as Permission);
        }
      });
      updatePermissions(newPermissions);
    };

    const handleSelectRow = (tab: string, checked: boolean) => {
      let newPermissions = [...permissions];
      const permIndex = newPermissions.findIndex(p => p.management_type === selectedManagement && p.tab === tab);
      if (permIndex > -1) {
        actions.forEach(action => { newPermissions[permIndex][`can_${action.id}`] = checked; });
      } else if (checked) {
        newPermissions.push({ management_type: selectedManagement, tab, can_read: true, can_write: true, can_edit: true, can_delete: true } as Permission);
      }
      updatePermissions(newPermissions);
    };

    const areAllSelected = tabs.every(tab => {
      const perm = permissions.find(p => p.management_type === selectedManagement && p.tab === tab);
      return perm && actions.every(action => perm[`can_${action.id}`]);
    });

    const isRowSelected = (tab: string) => {
      const perm = permissions.find(p => p.management_type === selectedManagement && p.tab === tab);
      return perm && actions.every(action => perm[`can_${action.id}`]);
    };

    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">
                <div className="flex items-center gap-2">
                  <Checkbox checked={areAllSelected} onCheckedChange={handleSelectAll} /> Tab
                </div>
              </TableHead>
              {actions.map(action => <TableHead key={action.id} className="text-center">{action.label}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tabs.map(tab => {
              const currentPerm = permissions.find((p: Permission) => p.management_type === selectedManagement && p.tab === tab);
              return (
                <TableRow key={tab}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Checkbox checked={isRowSelected(tab)} onCheckedChange={(checked) => handleSelectRow(tab, !!checked)} />
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </div>
                  </TableCell>
                  {actions.map(action => (
                    <TableCell key={action.id} className="text-center">
                      <Checkbox
                        checked={currentPerm?.[`can_${action.id}`] || false}
                        onCheckedChange={(checked) => handlePermissionChange(tab, action.id, !!checked)}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderMobile = () => (
    <Accordion type="multiple" className="w-full">
      {tabs.map(tab => {
        const currentPerm = permissions.find((p: Permission) => p.management_type === selectedManagement && p.tab === tab);
        return (
          <AccordionItem value={tab} key={tab}>
            <AccordionTrigger>{tab.charAt(0).toUpperCase() + tab.slice(1)}</AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 gap-4 p-4">
                {actions.map(action => (
                  <div key={action.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${tab}-${action.id}`}
                      checked={currentPerm?.[`can_${action.id}`] || false}
                      onCheckedChange={(checked) => handlePermissionChange(tab, action.id, !!checked)}
                    />
                    <Label htmlFor={`${tab}-${action.id}`}>{action.label}</Label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );

  return (
    <div>
      <h3 className="text-lg font-medium mb-2">Permissões</h3>
      <Select value={selectedManagement} onValueChange={onSelectedManagementChange}>
        <SelectTrigger className="w-[180px] mb-4">
          <SelectValue placeholder="Selecione a Gestão" />
        </SelectTrigger>
        <SelectContent>
          {managements.map(m => <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>)}
        </SelectContent>
      </Select>
      {isMobile ? renderMobile() : renderDesktop()}
    </div>
  );
}