import React, {useState, useEffect} from 'react';
import {useAppTheme} from './ThemeContext';
import {useNavigate} from 'react-router-dom';
import axios from 'axios';

const BusinessProfile = () => {
    const {themeStyles,toggleTheme,darkMode} = useAppTheme();
    const navigate = useNavigate();
    const [isCheckingProfile, setIsCheckingProfile] = useState(true);
    const [hasBusiness, setHasBusiness] = useState(false);
    const [formData, setFormData] = useState({
        owner_email: localStorage.getItem('userEmail') || '',
        legal_name: '',
        gstin:'',
        home_state: 'MAHARASHTRA',
        turnover_category: 'REGULAR'
    });
    const [errorMessage, setErrorMessage] = useState('');
    const indianStates = [
        "ANDHRA PRADESH", "ARUNACHAL PRADESH","ASSAM","BIHAR","CHHATTISGARH",
        "GOA","GUJARAT","HARYANA","HIMACHAL PRADESH","JHARKHAND","KARNATAKA",
        "KERALA","MADHYA PRADESH","MAHARASHTRA","MANIPUR","MEGHALAYA","MIZORAM",
        "NAGALAND","ODISHA","PUNJAB","RAJASTHAN","SIKKIM","TAMIL NADU","TELANGANA",
        "TRIPURA","UTTAR PRADESH","UTTARAKHAND","WEST BENGAL","DELHI","LADAKH"
    ];

    useEffect(() => {
            const checkExistingBusiness = async () => {
                if (!formData.owner_email) {
                    setLoading(false);
                    return;
                }
                try {
                                // Hits your backend endpoint to find profiles tied to this email
                                const response = await axios.get(`http://127.0.0.1:8000/create-business`, {
                                    params: { email: formData.owner_email }
                                });
                
                                // If a profile exists, bypass form creation and sync the original ID!
                                if (response.data && response.data.exists) {
                                    const bId = String(response.data.business_id);
                                    const hState = response.data.home_state || 'MAHARASHTRA';
                
                                    localStorage.setItem('activeBusinessId', bId);
                                    localStorage.setItem('businessHomeState', hState);
                
                                    console.log(`🎯 Existing business found! Syncing original ID: ${bId}`);
                                    navigate('/tax-dashboard'); // Go straight to the dashboard or ledger
                                    return;
                                }
                            } catch (error) {
                              	// FAIL-SAFE CATCH: If the route is missing or errors out, log it and don't freeze the screen!
                                console.error("Profile check routine encountered an error or route is missing:", error.message);
                            } finally {
                              	// This ensures the screen unlocks no matter what happens to the network request
                                setIsCheckingProfile(false);
                            }
                        };
                
                        checkExistingBusiness();
                    }, [formData.owner_email, navigate]);
                
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value.toUpperCase() });
    };
    const handleSubmit = async (e) =>{
        e.preventDefault();
        setErrorMessage('');
        if (formData.gstin.length != 15) {
            setErrorMessage("Invalid GSTIN format! An Indian GSTIN must be exactly 15 characters long.");
            return;
        }
        try {
            const response = await axios.post('http://127.0.0.1:8000/create-business',formData);
        	if (response.data && response.data.success) {
                const bId = response.data.business_id ? String(response.data.business_id) : '1';
                const hState = formData.home_state || 'MAHARASHTRA';
            
                localStorage.setItem('activeBusinessId', bId);
                localStorage.setItem('businessHomeState', hState);
            
                if (response.data.is_existing) {
                	console.log(`➡️ Existing business name entered. Redirecting straight to Ledger for ID: ${bId}`);
                    navigate('/transaction-ledger');
                } else {
                  	console.log(`🆕 Brand new business profile initialized. Heading to Ledger for ID: ${bId}`);
                    navigate('/transaction-ledger');
                }
                return;
               
            } else {
                setErrorMessage(response?.data?.error || "Failed to configure business profile.");
            }
        } catch (error) {
          	setErrorMessage(`Execution Stop: ${error.message} (Check if navigate exists)`);
        }
        
    };

    if (isCheckingProfile) {
     return <p style={{ textAlign: 'center', padding: '20px', color: themeStyles.color }}>Verifying profile data state...</p>;
     }
    
    return (
        <div style= {{padding: '40px', maxWidth:'500px',margin:'0 auto'}}>
        <button onClick={toggleTheme} style={{ float: 'right', marginBottom: '20px', padding: '8px 12px', cursor: 'pointer', border: `1px solid ${themeStyles.borderColor}`, backgroundColor: themeStyles.inputBackground, color: themeStyles.color }}>
            {darkMode ? '☀️ Light Mode' : '🌌 Dark Mode'}
        </button>

            <h2 style = {{ color:themeStyles.primaryColor,textAlign:'center'}}>Configure Business Profile</h2>

            <form onSubmit = {handleSubmit} style={{display:'flex',flexDirection:'column',gap:'15px',marginTop:'20px'}}>
                <div>
                    <label style={{fontSize: '14px',fontWeight:'bold'}}>Owner Email Reference</label>
                    <input
                    type ="text" name="owner_email" readOnly
                    value = {formData.owner_email}
                    style = {{padding:'10px',width:'100%',boxSizing:'border-box',backgroundColor:themeStyles.inputBackground,color:'#888',border:`1px solid ${themeStyles.borderColor}`}}
                    />
                </div>
                <div>
                    <label style={{fontSize:'14px', fontWeight:'bold'}}>Legal Business Name</label>
                    <input
                    type="text" name="legal_name" placeholder ="e.g sai trading business" required
                    value = {formData.legal_name} onChange={handleChange}
                    style={{padding:'10px',width:'100%',boxSizing:'border-box',backgroundColor:themeStyles.inputBackground,color:themeStyles.color,border:`1px solid ${themeStyles.borderColor}`}}
                    />
                </div>
                <div>
                    <label style={{fontSize:'14px',fontWeight:'bold'}}>15-Digit GSTIN Number</label>
                    <input
                    type="text" name="gstin" placeholder = "e.g, 27AAAAA1111A1Z1" required
                    value={formData.gstin} onChange={handleChange}
                    style={{padding:'10px',width:'100%',boxSizing:'border-box',backgroundColor:themeStyles.inputBackground,color:themeStyles.color,border:`1px solid ${themeStyles.borderColor}`}}
                    />
                </div>
                <div>
                    <label style={{fontSize:'14px',fontWeight:'bold'}}>Primary Home State Operating Base</label>
                    <select
                    name="home_state" value={formData.home_state} onChange={handleChange}
                    style={{padding:'10px',width:'100%',boxSizing:'border-box',backgroundColor:themeStyles.inputBackground,color:themeStyles.color,border:`1px solid ${themeStyles.borderColor}`}}
                    >
                        {indianStates.map((state) => (
                            <option key={state} value={state}>{state}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label style={{fontSize:'14px',fontWidth:'bold'}}>GST Filing Turnover Category</label>
                    <select
                    name="turnover_category" value={formData.turnover_category} onChange={handleChange}
                    style={{padding:'10px',width:'100%',boxSizing:'border-box',backgroundColor:themeStyles.inputBackgfound,color:themeStyles.color,border:`1px solid ${themeStyles.borderColor}`}}
                    >
                        <option value="REGULAR">REGULAR TAXPAYER SCHEME</option> 
                        <option value="COMPOSITION">COMPOSITION TAXPAYER SCHEME</option>
                    </select>
                </div>
                <button type="submit" style={{padding:'12px',backgroundColor:themeStyles.primaryColor,color:'#fff',border:'none',cursor:'pointer',fontWeight:'bold',marginTop:'10px'}}>
                    Save & Initialize Workspace
                </button>
            </form>
            {errorMessage && <p style={{color:'red',marginTop:'15px',textAlign:'center',fontSize:'14px'}}>{errorMessage}</p>}
            <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
                  {/* Existing Business Metadata Profile Cards (Legal Name, GSTIN, Address, etc.) */}
           		<div style={{ backgroundColor: '#FFF', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
                	<h3 style={{ margin: '0 0 4px 0', color: '#1E293B' }}>{formData?.legal_name || "Your Business Profile"}</h3>
                    <p style={{ margin: 0, color: '#64748B', fontSize: '14px' }}>GSTIN: {formData?.gstin || "Not Provided"}</p>
               	</div>
            
                  {/* 🚀 THE ONBOARDING IMPORT ACTION BANNER */}
                <div style={{
                	backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', 
                    borderRadius: '12px', padding: '20px', marginBottom: '24px'
              	}}>
                	<h4 style={{ margin: '0 0 6px 0', color: '#1E40AF' }}>📥 Jumpstart Your Tax Ledger</h4>
                    <p style={{ margin: '0 0 16px 0', color: '#1D4ED8', fontSize: '13px', lineHeight: '1.5' }}>
                      Have sales records from an old accounting application or a POS terminal? Upload them directly to generate instant tax compliance cards.
                    </p>
                    
                    <button
                    	onClick={() => navigate('/import')}
                      	style={{
                        	backgroundColor: '#2563EB', color: '#FFF', padding: '10px 18px',
                        	border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px',
                        	cursor: 'pointer', boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
                      	}}
                    >
                   		🚀 Import Existing Data File
                    </button>
            	</div>
            
                  {/* Rest of your Profile Settings Form elements below... */}
         	</div>
        </div>
    );
};

export default BusinessProfile;
