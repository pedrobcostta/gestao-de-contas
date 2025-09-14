import { supabase } from '@/integrations/supabase/client';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Navbar = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="font-semibold text-xl text-gray-800">
              Gestão de Contas
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" asChild>
              <Link to="/pessoal">Pessoal</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/casa">Casa</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/pai">Pai</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/mae">Mãe</Link>
            </Button>
            <Button onClick={handleLogout}>Logout</Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;