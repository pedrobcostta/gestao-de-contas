import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa, type SupabaseClient } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const pt = {
  sign_up: {
    email_label: 'Endereço de e-mail',
    password_label: 'Crie uma senha',
    email_input_placeholder: 'Seu endereço de e-mail',
    password_input_placeholder: 'Sua senha',
    button_label: 'Inscrever-se',
    loading_button_label: 'Inscrevendo-se...',
    social_provider_text: 'Inscreva-se com {{provider}}',
    link_text: 'Não tem uma conta? Inscreva-se',
    confirmation_text: 'Verifique seu e-mail para o link de confirmação',
  },
  sign_in: {
    email_label: 'Endereço de e-mail',
    password_label: 'Sua senha',
    email_input_placeholder: 'Seu endereço de e-mail',
    password_input_placeholder: 'Sua senha',
    button_label: 'Entrar',
    loading_button_label: 'Entrando...',
    social_provider_text: 'Entrar com {{provider}}',
    link_text: 'Já tem uma conta? Entrar',
  },
  magic_link: {
    email_input_label: 'Endereço de e-mail',
    email_input_placeholder: 'Seu endereço de e-mail',
    button_label: 'Enviar link mágico',
    loading_button_label: 'Enviando link mágico...',
    link_text: 'Enviar um link mágico por e-mail',
    confirmation_text: 'Verifique seu e-mail para o link mágico',
  },
  forgotten_password: {
    email_label: 'Endereço de e-mail',
    password_label: 'Sua senha',
    email_input_placeholder: 'Seu endereço de e-mail',
    button_label: 'Enviar instruções de redefinição de senha',
    loading_button_label: 'Enviando instruções de redefinição...',
    link_text: 'Esqueceu sua senha?',
    confirmation_text: 'Verifique seu e-mail para o link de redefinição de senha',
  },
  update_password: {
    password_label: 'Nova senha',
    password_input_placeholder: 'Sua nova senha',
    button_label: 'Atualizar senha',
    loading_button_label: 'Atualizando senha...',
    confirmation_text: 'Sua senha foi atualizada',
  },
};

const Login = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center">Acessar sua conta</h2>
        <Auth
          supabaseClient={supabase as SupabaseClient}
          appearance={{ theme: ThemeSupa }}
          view="sign_in"
          theme="light"
          showLinks={true}
          providers={[]}
          localization={{ variables: pt }}
        />
      </div>
    </div>
  );
};

export default Login;