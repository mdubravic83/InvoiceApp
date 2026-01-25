import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../lib/api';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('finzen_token');
        const savedUser = localStorage.getItem('finzen_user');
        
        if (token && savedUser) {
            try {
                setUser(JSON.parse(savedUser));
                setIsAuthenticated(true);
            } catch {
                localStorage.removeItem('finzen_token');
                localStorage.removeItem('finzen_user');
            }
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        const response = await authApi.login({ email, password });
        const { access_token, user: userData } = response.data;
        
        localStorage.setItem('finzen_token', access_token);
        localStorage.setItem('finzen_user', JSON.stringify(userData));
        
        setUser(userData);
        setIsAuthenticated(true);
        
        return userData;
    };

    const register = async (email, password, name) => {
        const response = await authApi.register({ email, password, name });
        const { access_token, user: userData } = response.data;
        
        localStorage.setItem('finzen_token', access_token);
        localStorage.setItem('finzen_user', JSON.stringify(userData));
        
        setUser(userData);
        setIsAuthenticated(true);
        
        return userData;
    };

    const logout = () => {
        localStorage.removeItem('finzen_token');
        localStorage.removeItem('finzen_user');
        setUser(null);
        setIsAuthenticated(false);
    };

    const updateUser = (userData) => {
        setUser(userData);
        localStorage.setItem('finzen_user', JSON.stringify(userData));
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            isAuthenticated,
            login,
            register,
            logout,
            updateUser,
        }}>
            {children}
        </AuthContext.Provider>
    );
};
