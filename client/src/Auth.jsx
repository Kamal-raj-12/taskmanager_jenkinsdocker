import React, { useState } from 'react';
import { User, Shield, Briefcase } from 'lucide-react';

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:4000/api' : '/api');

export default function Auth({ onLoginSuccess }) {
  const [selectedRole, setSelectedRole] = useState(null); // null, 'admin', 'employee'
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const endpoint = isLogin ? `${API_BASE_URL}/login` : `${API_BASE_URL}/signup`;
      const body = isLogin 
        ? { email: formData.email, password: formData.password }
        : { name: formData.name, email: formData.email, password: formData.password, role: selectedRole };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (isLogin) {
          // Verify the user's role matches the selected login type
          if (data.user.role !== selectedRole) {
            setError(`This account is registered as ${data.user.role}. Please use the correct login page.`);
            setLoading(false);
            return;
          }
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          onLoginSuccess(data.user);
        } else {
          // After signup, automatically log in
          setIsLogin(true);
          setError('Signup successful! Please login.');
        }
      } else {
        setError(data.message || 'Authentication failed');
      }
    } catch (err) {
      setError('Network error. Please make sure the server is running on port 4000.');
    } finally {
      setLoading(false);
    }
  };

  const resetToRoleSelection = () => {
    setSelectedRole(null);
    setIsLogin(true);
    setFormData({ name: '', email: '', password: '' });
    setError('');
  };

  // Role selection screen
  if (!selectedRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-4xl backdrop-blur-sm">
          <div className="text-center mb-12">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <User className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Task Manager
            </h1>
            <p className="text-gray-600 mt-2 text-lg">
              Select your role
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Admin Login */}
            <button
              onClick={() => setSelectedRole('admin')}
              className="group bg-gradient-to-br from-indigo-50 to-purple-50 border-3 border-indigo-200 rounded-2xl p-8 hover:shadow-2xl hover:scale-105 transition-all duration-300 text-left flex flex-col items-center justify-center"
            >
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 w-20 h-20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                <Shield className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-gray-800 mb-2">Admin Portal</h3>
            </button>

            {/* Employee Login */}
            <button
              onClick={() => setSelectedRole('employee')}
              className="group bg-gradient-to-br from-green-50 to-teal-50 border-3 border-green-200 rounded-2xl p-8 hover:shadow-2xl hover:scale-105 transition-all duration-300 text-left flex flex-col items-center justify-center"
            >
              <div className="bg-gradient-to-r from-green-600 to-teal-600 w-20 h-20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                <Briefcase className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-gray-800 mb-2">Employee Portal</h3>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Login/Signup form based on selected role
  const isAdminRole = selectedRole === 'admin';
  const roleColor = isAdminRole ? 'indigo' : 'green';
  const roleGradient = isAdminRole 
    ? 'from-indigo-600 to-purple-600' 
    : 'from-green-600 to-teal-600';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black opacity-20"></div>
      <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md backdrop-blur-sm">
        <button
          onClick={resetToRoleSelection}
          className="absolute top-4 left-4 text-gray-600 hover:text-gray-800 text-sm font-semibold flex items-center gap-1 hover:underline"
        >
          ← Back
        </button>

        <div className="text-center mb-8 mt-4">
          <div className={`bg-gradient-to-r ${roleGradient} w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg transform hover:scale-105 transition-transform`}>
            {isAdminRole ? <Shield className="w-10 h-10 text-white" /> : <Briefcase className="w-10 h-10 text-white" />}
          </div>
          <h1 className={`text-4xl font-bold bg-gradient-to-r ${roleGradient} bg-clip-text text-transparent`}>
            {isAdminRole ? 'Admin Portal' : 'Employee Portal'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isLogin ? 'Sign in to your workspace' : 'Create your account'}
          </p>
        </div>
        
        {error && (
          <div className={`${error.includes('successful') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} p-3 rounded-lg mb-4 text-sm`}>
            {error}
          </div>
        )}
        
        <div className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="Enter your name"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="Enter your email"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="Enter your password"
            />
          </div>

          {!isLogin && (
            <div className={`bg-${roleColor}-50 border-2 border-${roleColor}-200 rounded-xl p-3`}>
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Signing up as:</span> {isAdminRole ? 'Administrator' : 'Employee'}
              </p>
            </div>
          )}
          
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`w-full bg-gradient-to-r ${roleGradient} text-white py-3 rounded-xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </div>
        
        <button
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
          }}
          className={`w-full mt-4 text-${roleColor}-600 hover:underline font-semibold`}
        >
          {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}
        </button>
      </div>
    </div>
  );
}