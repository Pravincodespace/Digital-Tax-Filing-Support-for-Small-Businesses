import React, { useState, useEffect } from 'react';
import { useAppTheme } from './ThemeContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const TaxDashboard = () => {
    const { themeStyles } = useAppTheme();
    const navigate = useNavigate();
    const userEmail = localStorage.getItem('userEmail') || '';

    // 1. DYNAMIC BUSINESS PROFILE SESSION STATE TRACKING
    const [activeBusinessId, setActiveBusinessId] = useState(() => {
        return localStorage.getItem('activeBusinessId') || '1';
    });

    const [businessList, setBusinessList] = useState([]);
    const [summaryData, setSummaryData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    // 2. LOAD ALL REGISTERED BUSINESSES TIED TO THE USER'S EMAIL
    useEffect(() => {
        const fetchAllUserProfiles = async () => {
            if (!userEmail) return;
            try {
                const response = await axios.get('http://127.0.0.1:8000/get-user-all-businesses', {
                    params: { email: userEmail }
                });
                if (response.data?.success) {
                    setBusinessList(response.data.businesses);
                }
            } catch (error) {
                console.error("Failed to load business profile selections:", error);
            }
        };
        fetchAllUserProfiles();
    }, [userEmail]);

    // 3. LISTEN FOR LOCALSTORAGE MUTATIONS ACROSS CLIENT RUNTIMES
    useEffect(() => {
        const handleStorageSync = () => {
            const currentId = localStorage.getItem('activeBusinessId') || '1';
            setActiveBusinessId(currentId);
        };
        window.addEventListener('storage', handleStorageSync);
        return () => window.removeEventListener('storage', handleStorageSync);
    }, []);

    // 4. FETCH LIVE CALCULATED TAX STATS ACCORDING TO THE ACTIVE PROFILE ID
    useEffect(() => {
        const fetchTaxReport = async () => {
            try {
                setLoading(true);
                setErrorMessage('');

                const response = await axios.get('http://127.0.0.1:8000/tax-summary', {
                    params: {
                        business_id: parseInt(activeBusinessId, 10)
                    }
                });
                setSummaryData(response.data);
            } catch (error) {
                console.error("Dashboard calculation crunch error:", error);
                const serverError = error.response?.data?.detail || error.response?.data?.message;
                setErrorMessage(`Execution Error: ${serverError || error.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchTaxReport();
    }, [activeBusinessId]);

    // 5. DROPDOWN SELECTION SWITCHING INTERFACE HANDLER
    const handleProfileSwitch = (e) => {
        const selectedId = e.target.value;
        const matchedBusiness = businessList.find(b => String(b.id) === selectedId);

        if (matchedBusiness) {
            localStorage.setItem('activeBusinessId', String(matchedBusiness.id));
            localStorage.setItem('businessHomeState', matchedBusiness.home_state || 'MAHARASHTRA');
            setActiveBusinessId(String(matchedBusiness.id));
        }
    };

    if (loading) return <p style={{ textAlign: 'center', padding: '15px', color: themeStyles.color }}>Compiling ledger data metrics...</p>;
    if (errorMessage) return <p style={{ color: 'red', textAlign: 'center', padding: '20px' }}>{errorMessage}</p>;

    const data = summaryData?.summary || summaryData;
    const hasDataValues = data && (data.total_income_sales !== undefined || data.net_taxable_profit !== undefined);

    // 🔍 ADD THIS FUNCTION inside your TaxDashboard component body (above the return block)
    const handleExcelDownload = () => {
        if (!activeBusinessId) {
            alert("Error: Active business session token not initialized yet. Please try again.");
            return;
        }
        // Force fully resolved navigation URL explicitly
        const targetUrl = `http://127.0.0.1:8000/export-tax-excel?business_id=${activeBusinessId}`;
        console.log("🚀 Firing verified file stream request to route:", targetUrl);
        window.open(targetUrl, '_blank');
    };

    const handleGstr2Export = async () => {
      const activeId = localStorage.getItem('activeBusinessId') || '1';
      try {
        const targetUrl = `http://127.0.0.1:8000/export-gstr2?business_id=${activeBusinessId}`;
              
       	const response = await fetch(targetUrl, { method: 'GET' });;
        
        if (!response.ok) {
          if (response.status === 404) {
            alert("⚠️ No purchase ledger transactions found for this active business profile.");
          } else {
            throw new Error("Database export failure.");
          }
          return;
        }
    
        // 📥 Convert response stream directly into a downloadable Excel blob
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `GSTR2_Report_Active_${activeId}.xlsx`);
        
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url); // Clean up memory allocation
      } catch (err) {
        alert("❌ Export Error: Unable to fetch GSTR-2 workbook from FastAPI backend engine.");
      }
    };
    


    return (
        <div style={{ padding: '30px', maxWidth: '600px', margin: '0 auto', color: themeStyles.color || '#333' }}>
            <h2 style={{ color: themeStyles.primaryColor, textAlign: 'center', marginBottom: '5px' }}>Quarterly Tax Compliance Dashboard</h2>
            <p style={{ textAlign: 'center', fontSize: '13px', color: '#666', marginBottom: '20px' }}>
                Official Tax Report Ledger for Business Reference Token: ID-{activeBusinessId}
            </p>
            <div 
            	onClick={() => navigate('/analytics')}
                style={{
                	backgroundColor: '#0F4C81',
                    color: '#FFF',
                    padding: '20px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    marginBottom: '24px',
                    boxShadow: '0 4px 12px rgba(15, 76, 129, 0.15)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'transform 0.2s, background-color 0.2s'
                  }}
         	>
            	<div>
                	<h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 'bold' }}>📈 Open Business Intelligence Dashboard</h4>
                    <p style={{ margin: '0', fontSize: '13px', color: '#E2E8F0', opacity: 0.9 }}>
                    	View dynamic monthly cash flow trends and visual tax slab distribution graphs.
                    </p>
                </div>
                <span style={{ fontSize: '24px', paddingLeft: '12px' }}>📊 →</span>
            </div>
            
      

            {/* INTERACTIVE WORKSPACE SELECTION SWITCHER DROPDOWN */}
            {businessList.length > 0 && (
                <div style={{ marginBottom: '25px', textAlign: 'center', backgroundColor: themeStyles.cardBackground || '#f5f5f5', padding: '12px', borderRadius: '6px', border: `1px solid ${themeStyles.borderColor || '#eee'}` }}>
                    <label style={{ fontSize: '14px', fontWeight: 'bold', marginRight: '10px', display: 'block', marginBottom: '6px' }}>
                        🏢 Switch Active Business Workspace:
                    </label>
                    <select
                        value={activeBusinessId}
                        onChange={handleProfileSwitch}
                        style={{ padding: '8px 12px', width: '100%', maxWidth: '300px', boxSizing: 'border-box', backgroundColor: themeStyles.inputBackground || '#fff', color: themeStyles.color, border: `1px solid ${themeStyles.borderColor || '#ccc'}`, borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        {businessList.map((biz) => (
                            <option key={biz.id} value={biz.id}>
                                {biz.legal_name} (ID-{biz.id})
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* CONDITIONAL RENDER: BLANK WELCOME SCHEME VS REPORT CARD DISPLAY */}
            {!hasDataValues ? (
                <div style={{ padding: '30px 20px', textAlign: 'center', backgroundColor: themeStyles.cardBackground || '#f9f9f9', border: `1px solid ${themeStyles.borderColor || '#ddd'}`, borderRadius: '8px' }}>
                    <p style={{ marginBottom: '20px', fontSize: '15px' }}>
                        {summaryData?.message || "No transactional historical entries linked to this business account token."}
                    </p>
                    <button onClick={() => navigate('/transaction-ledger')} style={{ padding: '12px 24px', cursor: 'pointer', backgroundColor: themeStyles.primaryColor, color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
                        + Record First Invoice
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Commercial Turnover Metric Card */}
                    <div style={{ padding: '20px', backgroundColor: themeStyles.cardBackground || '#fff', borderLeft: `5px solid ${themeStyles.primaryColor}`, borderTop: `1px solid ${themeStyles.borderColor || '#eee'}`, borderRight: `1px solid ${themeStyles.borderColor || '#eee'}`, borderBottom: `1px solid ${themeStyles.borderColor || '#eee'}`, borderRadius: '4px' }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Commercial Turnover</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                            <span>Total Income (Gross Sales):</span>
                            <span style={{ fontWeight: 'bold', color: 'green' }}>₹{data?.total_income_sales ?? '0.00'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', marginTop: '8px' }}>
                            <span>Total Expense (Purchases):</span>
                            <span style={{ fontWeight: 'bold', color: 'red' }}>
                                ₹{data?.total_expanse_purchases ?? data?.total_expense_purchases ?? '0.00'}
                            </span>
                        </div>
                        <hr style={{ borderColor: themeStyles.borderColor || '#eee', margin: '12px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold' }}>
                            <span>Net Taxable Business Profit:</span>
                            <span style={{ color: (parseFloat(data?.net_taxable_profit) || 0) >= 0 ? 'green' : 'red' }}>
                                ₹{data?.net_taxable_profit ?? '0.00'}
                            </span>
                        </div>
                    </div>

                    {/* GST Liability Pools Summary Card */}
                    <div style={{ padding: '20px', backgroundColor: themeStyles.cardBackground || '#fff', borderLeft: '5px solid orange', borderTop: `1px solid ${themeStyles.borderColor || '#eee'}`, borderRight: `1px solid ${themeStyles.borderColor || '#eee'}`, borderBottom: `1px solid ${themeStyles.borderColor || '#eee'}`, borderRadius: '4px' }}>
                        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: 'orange' }}>GST Statutory Liability Breakdown</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'monospace', fontSize: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>     
                                <span>Central Pool (CGST Owed)</span>
                                <span>{data?.tax_breakdown?.cgst_owed}</span>
                            </div>
                            <div style={{display:'flex',justifyContent:'space-between'}}>
                                <span>State Pool (SGST Owed)</span>
                                <span>{data?.tax_breakdown?.sgst_owed}</span>
                            </div>
                            <div style={{display:'flex',justifyContent:'space-between'}}>
                                <span>Integrated (IGST Owes)</span>
                                <span>{data?.tax_breakdown?.igst_owed}</span>
                            </div>
                            <hr style={{borderColor:themeStyles.borderColor,margin:'5px 0'}} />
                            <div style={{display:'flex',justifyContent:'space-between',fontSize:'15px',fontWeight:'bold',color: themeStyles.primaryColor}}>
                                <span>TOTAL CONSOLIDATED GST:</span>
                                <span>{data?.tax_breakdown?.total_gst_liability}</span>
                            </div>
                        </div>
                    </div>
                    <div style={{display:'flex',gap:'15px',marginTop:'10px'}}>
                        <button onClick={() => navigate('/transaction-ledger')} style={{flex:1,padding:'12px',cursor:'pointer',border:`1px solid ${themeStyles.borderColor}`,backgroundColor:'transparent',color:themeStyles.color}}>
                            ⬅️ Add Another Invoice
                        </button>
                        <button onClick={() => {localStorage.clear();navigate('/');}} style={{flex:1,padding:'12px',cursor:'pointer',backgroundColor:'#d93838',color:'#fff',border:':none'}}>
                            Log Out Sessiom
                        </button>
                        <button onClick={() => navigate('/business-profile')} style={{ flex: 1, padding: '12px', cursor: 'pointer', backgroundColor: themeStyles.primaryColor, color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>➕ Register New Enterprise
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '15px' }}>
                        
                        {/* 🔍 HIGH-UTILITY PURE EXCEL STREAMING INTERFACE DOWNLOAD ANCHOR */}
                        <button
                        	onClick={handleExcelDownload}
                            style={{ 
                                textDecoration: 'none',
                                textAlign: 'center',
                                padding: '12px', 
                                cursor: 'pointer', 
                                backgroundColor: '#1D7444', // Native Excel deep green style code
                                color: '#fff', 
                                border: 'none', 
                                borderRadius: '4px', 
                                fontWeight: 'bold',
                                fontSize: '15px',
                                display: 'block'
                            }}
                        >
                            📥 Download Chronological Tax Ledger (.xlsx)
                        </button>
                    
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <button onClick={() => navigate('/transaction-ledger')} style={{ flex: 1, padding: '12px', cursor: 'pointer', border: `1px solid ${themeStyles.borderColor || '#ccc'}`, backgroundColor: 'transparent', color: themeStyles.color || '#333', borderRadius: '4px' }}>
                                ⬅️ Add Another Invoice
                            </button>
                            <button onClick={() => navigate('/business-profile')} style={{ flex: 1, padding: '12px', cursor: 'pointer', backgroundColor: themeStyles.primaryColor, color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
                                ➕ Register New Enterprise
                            </button>

                        <button
                          onClick={handleGstr2Export}
                          style={{
                            backgroundColor: '#0F4C81',
                            color: '#FFF',
                            padding: '12px 20px',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            marginBottom: '20px'
                          }}
                        >
                          📥 Export GSTR-2 Spreadsheet Report
                        </button>
                        
                        </div>
                    </div>
                </div>

            )}
            
        </div>
    );
};
export default TaxDashboard;
