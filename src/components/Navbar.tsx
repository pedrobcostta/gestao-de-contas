import { supabase } from '@/integrations/supabase/client';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';

const NavLinks = ({ isMobile = false }: { isMobile?: boolean }) => (
  <div className={isMobile ? "flex flex-col space-y-4" : "flex items-center space-x-4"}>
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
  </div>
);

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
          <Link to="/" className="font-semibold text-xl text-gray-800">
            Gestão de Contas
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-4">
            <NavLinks />
            <Button onClick={handleLogout}>Logout</Button>
          </div>

          {/* Mobile Nav */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <div className="flex flex-col space-y-6 mt-8">
                  <NavLinks isMobile />
                  <Button onClick={handleLogout}>Logout</Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;