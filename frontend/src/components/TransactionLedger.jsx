import React, {useState , useEffect} from 'react';
import {useAppTheme} from './ThemeContext';
import {useNavigate} from 'react-router-dom';
import axios from 'axios';

const TransactionLedger = () =>{
    const{themeStyles}= useAppTheme();
    const navigate = useNavigate();

    const [activeBusinessId, setActiveBusinessId] = useState(() => {
            return localStorage.getItem('activeBusinessId') || '1';
        });
    useEffect(() => {
            const syncActiveProfile = () => {
                const currentId = localStorage.getItem('activeBusinessId') || '1';
                setActiveBusinessId(currentId);
                console.log(`📡 Transaction Ledger synced to active Business ID: ${currentId}`);
            };
    syncActiveProfile();

    window.addEventListener('storage', syncActiveProfile);
            return () => window.removeEventListener('storage', syncActiveProfile);
        }, []);
        
    const  businessHomeState = localStorage.getItem('businessHomeState') || 'MAHARASHTRA';

    const [formData, setFormData] = useState({
        business_id: parseInt(activeBusinessId),
        date: new Date().toISOString().split('T')[0],
        transaction_type: 'INCOME',
        product_name:'',
        gross_amount:'',
        discount:'0',
        extra_charges:'0',
        gst_rate:'18',
        place_of_supply:businessHomeState
    });
    const [calcResult, setCalcResult]=useState(null);
    const [errorMessage,setErrorMessage]=useState('');

    const indianStates=[
        "ANDHRA PRADESH","ARUNACHAL PRADESH","ASSAM","BIHAR","CHHATTISGARH","GOA",
        "GUJARAT","HARYANA","HIMACHAL PRADESH","JHARKHAND","KARNATAKA","KERALA",
        "MADHYA PRADESH","MAHARASHTRA","MANIPUR","MEGHALAYA","MIZORAM","NAGALAND",
        "ODISHA","PUNJAB","RAJASTHAN","SIKKIM","TAMIL NADU","TELANGANA","TRIPURA",
        "UTTAR PRADESH","UTTARAKHAND","WEST BENGAL","DELHI","LADAKH","INTERNATIONAL"
    ];
    const handleChange = (e)=>{
        setFormData({...formData, [e.target.name]: e.target.value});
    };
    const handleProductLookup = async () => {
    	const query = formData.product_name.trim().toLowerCase();
        if (!query) return;
    
        try {
            // Use the explicit 'params' configuration block for reliable URL building:
            const response = await axios.get('http://127.0.0.1:8000/autofill-item', {
                params: {
                    product_name: query
                }
            });
            
            console.log("Backend response received:", response.data);
    
            if (response.data && response.data.found) {
                const rawRate = response.data.auto_gst_rate;
                // Ensure a string format matching your dropdown option values (e.g., "18" or "0")
                const cleanRate = String(Math.floor(rawRate)); 
    
                setFormData(prev => ({
                    ...prev,
                    gst_rate: cleanRate
                }));
                console.log("Tax dropdown successfully updated to slab:", cleanRate);
            }
        } catch (error) {
            console.error("Catalog autofill lookup communication failure:", error);
        }
    };

    const handleSubmitInvoice = async (formData) => {
            try {
                const payload = {
                    ...formData,
                    // Always binds securely to the reactive active tracking token slot
                    business_id: parseInt(activeBusinessId, 10) 
                };
                
                const response = await axios.post('http://127.0.0.1:8000/tax-summary', payload);
                if (response.data.success) {
                    navigate('/tax-dashboard');
                }
            } catch (error) {
                console.error("Failed to compile item transaction:", error);
            }
        };
    
    const handleSubmit = async (e)=>{
        e.preventDefault();
        setErrorMessage('');
        setCalcResult(null);
        

        try {
            const response= await axios.post('http://127.0.0.1:8000/add-transaction-v2', {
                ...formData,
                business_id: parseInt(formData.business_id) || 1,
                transaction_type: formData.transaction_type || 'INCOME',
                product_name: formData.product_name || 'Generic Item',
                gross_amount: parseFloat(formData.gross_amount) || 0.0,
                discount: parseFloat(formData.discount) || 0.0,
                extra_charges: parseFloat(formData.extra_charges) || 0.0,
                gst_rate: parseFloat(formData.gst_rate) || 18.0,
                place_of_supply: formData.place_of_supply || 'MAHARASHTRA'
            });
            if(response.data) {
                setCalcResult(response.data);
            }
        } catch (error) {
            setErrorMessage(error.response?.data?.detail || "Calculation submission failed.");
        }
    };
    return (
        <div style={{padding:'30px',maxWidth:'600px',margin:'0 auto'}}>
            <h2 style={{color:themeStyles.primaryColor,textAlign:'center'}}>Record Financial Invoice</h2>
            <p style={{textAlign:'center',fontSize:'14px',color:'#666'}}>Managing Business ID Reference: {activeBusinessId}</p>

            <form onSubmit={handleSubmit} style={{ display:'flex',flexDirection:'column', gap:'15px',marginTop:'20px'}}>
            	<div style={{marginBottom: '15px'}}>
                	<label style={{fontSize:'13px',fontWeight:'bold',display:'block',marginBottom:'5px'}}>Transaction Nature</label>
                	<select name="transaction_type" value={formData.transaction_type} onChange={handleChange} style={{padding:'10px',width:'100%',boxSizing:'border-box',backgroundColor:themeStyles.inputBackground,color:themeStyles.color,border:`1px solid ${themeStyles.borderColor}`}}>
                		<option value="INCOME">INCOME (Customer Sales Biling)</option>
                    	<option value="EXPENSE">EXPENSE (Vendor Purchase Log)</option>
                	</select>
                </div>
                <div>
                	<label style={{ fontSize: '13px', fontWeight: 'bold' }}>Product Name / Service Description</label>
                    <input 
                    	type="text" 
                        name="product_name" 
                        required 
                        placeholder="e.g. Laptop, Packaging Services, Milk Boxes" 
                        value={formData.product_name} 
                        onChange={handleChange} 
                        onBlur={handleProductLookup}
                        style={{ padding: '10px', width: '100%', boxSizing: 'border-box', backgroundColor: themeStyles.inputBackground, color: themeStyles.color, border: `1px solid ${themeStyles.borderColor}` }} 
                    />
              	</div>
              	<div>
              	<label style={{ fontSize: '14px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
              	        📆 Invoice Execution Date
              	    </label>
              	    <input
              	        type="date"
              	        name="date"
              	        required
              	        value={formData.date}
              	        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              	        style={{
              	            padding: '10px',
              	            width: '100%',
              	            boxSizing: 'border-box',
              	            backgroundColor: themeStyles.inputBackground || '#fff',
              	            color: themeStyles.color,
              	            border: `1px solid ${themeStyles.borderColor || '#ccc'}`,
              	            borderRadius: '4px',
              	            fontSize: '15px'
              	        }}
              	    />
              	</div>
                <div style={{marginBottom:'15px'}}>
                	<label style={{fontSize:'13px',fontWeight:'bold',display:'block',marginBottom:'5px'}}>Place of Supply (pos Target)</label>
                    <select name="place_of_supply" value={formData.place_of_supply} onChange={handleChange} style={{padding:'10px',width:'100%',boxSizing:'border-box',backgroundColor:themeStyles.inputBackground,color:themeStyles.color,border:`1px solid $(themeStyles.borderColor}`}}>
                    	{indianStates.map((st) => <option key={st} value={st}>{st}</option>)}
                    </select>
             	</div>
                
                <div>
                    <label style={{fontSize:'13px',fontWeight:'bold'}}>Gross Transaction Amount ()</label>
                    <input type="number" name="gross_amount" required placeholder="0.00" value={formData.gross_amount} onChange={handleChange} style={{padding:'10px',width:'100%',boxSizing:'border-box',backgroundColor:themeStyles.inputBackground,color:themeStyles.color,border:`1px solid ${themeStyles.borderColor}`}}/>
                </div>
                <div style={{display:'flex',gap:'15px'}}>
                    <div style={{flex:1}}>
                        <label style={{fontSize:'13px',fontWeight:'bold'}}>Discount Applied ()</label>
                        <input type="number" name="discount" value={formData.discount} onChange={handleChange} style={{padding:'10px', width:'100%',boxSizing:'border-box',backgroundColor:themeStyles.inputBackground,color:themeStyles.color,border:`1px solid ${themeStyles.borderColor}`}} />
                    </div>
                    <div style={{flex:1}}>
                        <label style={{fontSize:'13px',fontWeight:'bold'}}>Extra Charges/Freight ()</label>
                        <input type="number" name="extra_charges" value={formData.extra_charges} onChange={handleChange} style={{padding:'10px',width:'100%',boxSizing:'border-box',backgroundColor:themeStyles.inputBackgroud,color:themeStyles.color,border:`1px solid ${themeStyles.borderColor}`}}/>
                    </div>
                </div>
                <div>
                    <label style={{fontSize:'13px',fontWeight:'bold'}}>Legal GST Tax Slab Percentage</label>
                    <select name="gst_rate" value={formData.gst_rate} onChange={handleChange} style={{padding:'10px',width:'100%',backgroundColor:themeStyles.inputBackground,color:themeStyles.color,border:`1px solid ${themeStyles.borderColor}`}}>
                        <option value="0">0% Slab (Exempt Goods)</option>
                        <option value="5">5% Slab (Essentials)</option>
                        <option value="12">12% Slab (Standard Economy)</option>
                        <option value="18">18% Slab (Standard Tech/Services)</option>
                        <option value="28">28% Slab (Luxury Items)</option>
                    </select>
                </div>
                <button type="submit" style={{padding:'12px',backgroundColor:themeStyles.primaryColor,color:'#fff',border:'none',cursor:'pointer',fontWeight:'bold'}}>
                    Compute Tax And Save Invoice Line
                </button>
            </form>
            {errorMessage && <p style={{color:'red',marginTop:'15px',textAlign:'center'}}>{errorMessage}</p>}
            {calcResult && (
                <div style={{marginTop:'25px',padding:'15px',backgroundColor:themeStyles.cardBackground,border:`1px solid ${themeStyles.borderColor}`}}>
                    <h4 style={{color:'green',margin:'0 0 10px 0',}}>Invoice Loged Cleanly!</h4>
                    <pre style={{ fontSize: '10px', color: 'blue', backgroundColor: '#eee', padding: '5px' }}>
                        {JSON.stringify(calcResult, null, 2)}
                    </pre>
                    
                    <p style={{fontSize:'13px',fontStyle:'italic',color:'#666'}}>{calcResult.summary}</p>
                    <hr style={{borderColor:themeStyles.borderColor}}/>
                    <div style={{diaplay:'flex',flexDirection:'column',gap:'5px',fontSize:'14px',fontFamily:'monospace',marginTop:'10px'}}>
                        <div>Base Taxable Value: <strong>{calcResult.taxable_value || '0.00'}</strong></div>
                        <div>Central Tax(CGST): <strong>{calcResult.cgst_amount || '0.00'}</strong></div>
                        <div>State Tax(SGST): <strong>{calcResult.sgst_amount || '0.00'}</strong></div>
                        <div>Border Tax(IGST): <strong>{calcResult.igst_amount || '0.00'}</strong></div>
                        <div style={{fontWeight:'bold',color:themeStyles.primaryColor}}>Grand Total Bill : {calcResult.grand_total || '0.00'}</div>
                    </div>
                    <button onClick={() => navigate('/tax-summary')} style={{marginTop:'15px',width:'100%',padding:'10px',cursor:'pointer'}}>
                        Full View Quaterly Tax Report ➡️
                    </button>
                </div>
            )}
        </div>
    );
};
export default TransactionLedger;
