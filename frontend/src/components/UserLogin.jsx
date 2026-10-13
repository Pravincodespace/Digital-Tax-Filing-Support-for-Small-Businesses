import React,{useState} from 'react';
import {useAppTheme} from './ThemeContext';
import {useNavigate,Link} from 'react-router-dom';
import axios from 'axios';

const UserLogin = () =>{
    const {themeStyles,toggleTheme, darkMode}= useAppTheme();
    const navigate = useNavigate();
    const [formData,setFormData] = useState({email:'',password:''});
    const [message,setMessage] = useState('');

    const handleChange = (e) =>{
        setFormData({...formData,[e.target.name]: e.target.value});
    };
    const handleSubmit = async (e) =>{
        e.preventDefault();
        setMessage('');
        try{
            const response = await axios.post('http://127.0.0.1:8000/login',formData);
            if (response.data.login_status === "success"){
                localStorage.setItem('authToken',response.data.access_token);
                localStorage.setItem('userEmail',formData.email);
                navigate('/business-profile');
            }
        } catch (error){
            setMessage(error.response?.data?.detail || "Login Failed. Check details.");
        }
    };
    return (
        <div style={{padding:'40px',maxWidth:'400px',margin:'0 auto'}}>
            <button onClick={toggleTheme} style={{float:'right',marginBottom:'20px'}}>
                {darkMode ? '☀️ Light Mode':'🌌 Dark Mode'}
            </button>
            <h2 style={{color:themeStyles.primaryColor}}>Login to Business Account</h2>
            <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:'15px'}}>
                <input
                type="email" name="email" placeholder="Email Address" required
                value={formData.email} onChange={handleChange}
                style={{padding:'10px',backgroundColor:themeStyles.inputBackground,color:themeStyles.color,border:`1px solid ${themeStyles.borderColor}`}}
                />
                <input
                type="password" name="password" placeholder="Password" required
                value={formData.password} onChange={handleChange}
                style={{padding:'10px',backgroundColor:themeStyles.inputBackground,color:themeStyles.color,border:`1px solid ${themeStyles.borderColor}`}}
                />
                <button type="submit" style={{padding:"12px",backgroundColor:themeStyles.primaryColor,color:'#fff',border:'none',cursor:'pointer',fontWeight:'bold'}}>
                    Login Securely
                </button>
            </form>
            {message && <p style={{color:'red',marginTop:'15px',textAlign:'center'}}>{message}</p>}
            <p style={{margintop:'20px',textAlign:'center',fontSize:'14px'}}>
                New User? <Link to="/register" styles={{color:themeStyles.primaryColor}}>Create an account here</Link>
            </p>
        </div>
    );
};
export default UserLogin;
