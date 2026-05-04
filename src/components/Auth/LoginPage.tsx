// src/components/Auth/LoginPage.tsx
import React, { useState } from 'react';
import { LogIn, Mail, Lock } from 'lucide-react';

interface LoginPageProps {
  onLogin: (email: string, password: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};
    if (!email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email is invalid';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // if (validateForm()) {
    //   onLogin(email, password);
    // }
    onLogin(email, password);
  };

  return (
    <div className="min-h-screen  flex items-center justify-center p-2">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-primary-600 p-6 text-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-10 h-10 text-primary-600" />
          </div>
          <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
          <p className="text-primary-100 mt-2">Sign in to your account</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8">
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-semibold mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field pl-10"
                placeholder="admin@company.com"
              />
            </div>
            {errors.email && <p className="error-message">{errors.email}</p>}
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-semibold mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pl-10"
                placeholder="••••••••"
              />
            </div>
            {errors.password && <p className="error-message">{errors.password}</p>}
          </div>
          
          <button type="submit" className="btn-primary w-full">
            Sign In
          </button>
          
          <p className="text-center text-gray-600 text-sm mt-4">
            Demo credentials: admin@company.com / admin123
          </p>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
