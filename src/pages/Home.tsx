import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Home = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <span className="font-semibold text-xl text-gray-800">Gestão de Contas</span>
            </div>
            <div className="flex items-center space-x-4">
              {/* Navigation buttons will go here */}
              <Button variant="outline">Pessoal</Button>
              <Button variant="outline">Casa</Button>
              <Button variant="outline">Pai</Button>
              <Button variant="outline">Mãe</Button>
              <Button onClick={handleLogout}>Logout</Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="p-8">
        <h1 className="text-3xl font-bold mb-6">Dashboard Geral</h1>
        <div className="text-center">
          <p className="text-xl text-gray-600">
            Resumo consolidado do mês atual aparecerá aqui.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Home;