import React, {useState} from 'react'
import {useAppTheme} from './ThemeContext';
import {useNavigate} from 'react-router-dom';
import axios from 'axios';

const UserRegister = () => {
    const {themeStyles, toggleTheme, darkMode} = useAppTheme();
    const [formData, setFormData] = useState({full_name : '', email : '', password : ''});
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value});
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        try{
            const response = await axios.post('http://127.0.0.1:8000/register',formData);
            if(response.data.success) {
                setMessage(`Account successfully created for ${formData.full_name}!`);
            }
        } catch (error) {
            setMessage(error.response?.data?.detail || "Registration failed. Try agaim.");
        }
    };
    return (
        <div style={{padding: '40px', maxWidth: '400px',margin : '0 auto'}}>
            <button onClick={toggleTheme} style={{float: 'right', marginBottom:'20px'}}>
                {darkMode ? '☀️ Light Mode' : '🌌 Dark Mode'}
            </button>

            <h2 style = {{color: themeStyles.primaryColor}}>Create small Business Account</h2>
            <form onSubmit = {handleSubmit} style = {{display: 'flex', flexDirection: 'column', gap: '15'}}>
                <input
                type="text" name="full_name" placeholder = "Full Name" required
                value = {formData.full_name} onChange = {handleChange}
                style = {{padding : '10px', backgroundcolor: themeStyles.inputBackground, color: themeStyles.color,border: '1px solid ${themeStyles.borderColor}'}}
                />
                <input
                type = "email" name="email" placeholder = "Email Address" required
                value = {formData.email} onChange = {handleChange}
                style = {{padding : '10px', backgroundcolor : themeStyles.inputBackground, color : themeStyles.color, border: '1px solid ${themeStyles.borderColor}'}}
                />
                <input
                type = "text" name="password" placeholder = "Password" required
                value = {formData.password} onChange={handleChange}
                style = {{padding: '10px', backgroundcolor:themeStyles.inputBackground, color: themeStyles.color, border: '1px solid ${themeStyles.borderColor}'}}
                />
                <button type ="submit" style = {{padding: '12px', backgroundColor:themeStyles.primaryColor, color: '#fff', border: 'none', cursor: 'pointer'}}>
                    Register Account
                </button>
            </form>
            {message && <p style = {{marginTop: '20px',textAlign: 'center', fontweight: 'bold'}}>{message}</p>}
            <p style={{ marginTop: '25px', textAlign: 'center', fontSize: '14px' }}>
            	Already have an account?{' '}
                <span onClick={() => navigate('/')} style={{ color: themeStyles.primaryColor, cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}>
                	Login here
                </span>
            </p>
    	</div>
    );
};

export default UserRegister;
