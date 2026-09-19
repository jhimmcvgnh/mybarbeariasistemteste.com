import React, { useState } from 'react';
import { User, Lock, ArrowRight, Store, Phone, CheckCircle2 } from 'lucide-react';
import { NeuralNoise } from './ui/neural-noise';
import { useAuth } from '../hooks/useAuth';

export const LoginScreen: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  
  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Register fields
  const [name, setName] = useState('');
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!name || !shopName || !email || !password) {
          throw new Error('Por favor, preencha todos os campos obrigatórios.');
        }
        await register(email.trim(), password, name.trim(), phone.trim(), shopName.trim());
        setSuccess('Conta criada com sucesso! Conectando ao painel...');
        // Tentativa de login automático se necessário
        try {
          await login(email.trim(), password);
        } catch (_) {}
      } else {
        await login(email.trim(), password);
      }
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("Email not confirmed")) {
        setError("Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.");
      } else if (err.message?.includes("Invalid login")) {
        setError("E-mail ou senha incorretos. Verifique seus dados ou crie uma conta.");
      } else if (err.message?.includes("already registered")) {
        setError("Este e-mail já está cadastrado. Faça login ou use outro e-mail.");
      } else {
        setError(`Erro: ${err.message || 'Falha ao autenticar'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative w-screen h-screen bg-black font-display overflow-hidden">
      <NeuralNoise color={[1.0, 0.384, 0.169]} opacity={0.8} speed={0.001} />

      <div className="relative z-10 flex items-center justify-center w-full h-full p-3 sm:p-4 pointer-events-none">
        <div className="w-full max-w-md p-5 sm:p-8 space-y-4 sm:space-y-6 max-h-[96vh] overflow-y-auto hide-scrollbar bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-2xl pointer-events-auto">
          
          {/* Header */}
          <div className="text-center">
            <div className="flex justify-center items-center text-white mb-2 sm:mb-3">
              <span className="material-icons-outlined text-3xl text-primary">content_cut</span>
              <span className="ml-2 font-bold text-2xl tracking-wide">Barber Flow</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              {isRegister ? 'Cadastrar Barbearia' : 'Bem-vindo!'}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-gray-300">
              {isRegister ? 'Crie sua conta para gerenciar seus agendamentos' : 'Faça login para acessar o painel'}
            </p>
          </div>

          {/* Mode Switch Tabs */}
          <div className="flex bg-white/10 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => { setIsRegister(false); setError(''); setSuccess(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                !isRegister ? 'bg-primary text-white shadow-md' : 'text-gray-300 hover:text-white'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => { setIsRegister(true); setError(''); setSuccess(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                isRegister ? 'bg-primary text-white shadow-md' : 'text-gray-300 hover:text-white'
              }`}
            >
              Criar Nova Conta
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {isRegister && (
              <>
                {/* Nome do Proprietário */}
                <div className="relative z-0">
                  <input
                    type="text"
                    id="floating_name"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setError(''); }}
                    className="block py-2.5 px-0 w-full text-sm text-white bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-primary peer"
                    placeholder=" "
                    required={isRegister}
                  />
                  <label
                    htmlFor="floating_name"
                    className="absolute text-sm text-gray-300 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-primary peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
                  >
                    <User className="inline-block mr-2 -mt-1" size={16} />
                    Seu Nome Completo *
                  </label>
                </div>

                {/* Nome da Barbearia */}
                <div className="relative z-0">
                  <input
                    type="text"
                    id="floating_shop"
                    value={shopName}
                    onChange={(e) => { setShopName(e.target.value); setError(''); }}
                    className="block py-2.5 px-0 w-full text-sm text-white bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-primary peer"
                    placeholder=" "
                    required={isRegister}
                  />
                  <label
                    htmlFor="floating_shop"
                    className="absolute text-sm text-gray-300 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-primary peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
                  >
                    <Store className="inline-block mr-2 -mt-1" size={16} />
                    Nome da sua Barbearia *
                  </label>
                </div>

                {/* Telefone */}
                <div className="relative z-0">
                  <input
                    type="tel"
                    id="floating_phone"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setError(''); }}
                    className="block py-2.5 px-0 w-full text-sm text-white bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-primary peer"
                    placeholder=" "
                  />
                  <label
                    htmlFor="floating_phone"
                    className="absolute text-sm text-gray-300 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-primary peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
                  >
                    <Phone className="inline-block mr-2 -mt-1" size={16} />
                    WhatsApp / Telefone
                  </label>
                </div>
              </>
            )}

            {/* Email */}
            <div className="relative z-0">
              <input
                type="email"
                id="floating_email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                className="block py-2.5 px-0 w-full text-sm text-white bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-primary peer"
                placeholder=" "
                required
                autoComplete="email"
              />
              <label
                htmlFor="floating_email"
                className="absolute text-sm text-gray-300 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-primary peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
              >
                <User className="inline-block mr-2 -mt-1" size={16} />
                Endereço de E-mail *
              </label>
            </div>

            {/* Password */}
            <div className="relative z-0">
              <input
                type="password"
                id="floating_password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className="block py-2.5 px-0 w-full text-sm text-white bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-primary peer"
                placeholder=" "
                required
                autoComplete="current-password"
              />
              <label
                htmlFor="floating_password"
                className="absolute text-sm text-gray-300 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-primary peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
              >
                <Lock className="inline-block mr-2 -mt-1" size={16} />
                Senha *
              </label>
            </div>

            {/* Success Message */}
            {success && (
              <div className="text-emerald-300 text-xs text-center bg-emerald-950/60 p-3 rounded-xl border border-emerald-500/50 flex items-center justify-center gap-2 animate-in fade-in">
                <CheckCircle2 size={16} />
                {success}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="text-red-300 text-xs text-center bg-red-950/60 p-3 rounded-xl border border-red-500/50 animate-in fade-in">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="group w-full flex items-center justify-center py-3 px-4 bg-primary hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed rounded-xl text-white font-bold shadow-lg shadow-primary/30 transition-all duration-300 mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {isRegister ? 'Criando Barbearia...' : 'Entrando...'}
                </span>
              ) : (
                <>
                  {isRegister ? 'Cadastrar e Conectar' : 'Entrar no Sistema'}
                  <ArrowRight className="ml-2 h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="pt-3 border-t border-white/10 text-center">
            <p className="text-xs text-gray-400">
              {isRegister ? (
                <>Já tem conta? <button type="button" onClick={() => { setIsRegister(false); setError(''); }} className="font-bold text-primary hover:underline ml-1">Fazer Login</button></>
              ) : (
                <>Não tem conta? <button type="button" onClick={() => { setIsRegister(true); setError(''); }} className="font-bold text-primary hover:underline ml-1">Cadastrar Barbearia</button></>
              )}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};
