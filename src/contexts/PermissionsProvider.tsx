import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthProvider';
import { Permission } from '@/types';

type PermissionsContextType = {
  permissions: Permission[];
  hasPermission: (management: string, tab: string, action: 'read' | 'write' | 'edit' | 'delete') => boolean;
  isLoading: boolean;
};

const PermissionsContext = createContext<PermissionsContextType>({
  permissions: [],
  hasPermission: () => false,
  isLoading: true,
});

export const PermissionsProvider = ({ children }: { children: React.ReactNode }) => {
  const { session } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (session?.user?.id) {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('user_permissions')
          .select('*')
          .eq('user_id', session.user.id);
        
        if (error) {
          console.error("Error fetching permissions:", error);
        } else {
          setPermissions(data || []);
        }
        setIsLoading(false);
      } else if (!session) {
        setPermissions([]);
        setIsLoading(false);
      }
    };
    fetchPermissions();
  }, [session]);

  const hasPermission = (management: string, tab: string, action: 'read' | 'write' | 'edit' | 'delete'): boolean => {
    const perm = permissions.find(p => p.management_type === management && p.tab === tab);
    if (!perm) return false;
    return perm[`can_${action}`];
  };

  return (
    <PermissionsContext.Provider value={{ permissions, hasPermission, isLoading }}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => useContext(PermissionsContext);