import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const result = await login(email, password);
        if (result.success) {
            const user = result.user;
            // Redirect based on role
            if (user.role === 'admin') {
                navigate('/admin');
            } else if (user.role === 'seller' || (user.roles && user.roles.includes('seller'))) {
                navigate('/seller-dashboard');
            } else {
                navigate('/');
            }
        } else {
            setError(result.message);
        }
    };

    return (
        <section className="login-page">
            <h2>Sign In</h2>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" className="login-button">Sign In</button>
            </form>
            <p>New customer? <a href="/register">Start here.</a></p>
        </section>
    );
};

export default Login;
