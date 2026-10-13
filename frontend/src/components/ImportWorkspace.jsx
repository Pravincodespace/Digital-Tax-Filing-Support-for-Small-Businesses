import React, { useState } from 'react';
import {useNavigate} from 'react-router-dom';

export default function ImportWorkspace({ businessId, onImportComplete }) {
  // Application State Blocks
  const [file, setFile] = useState(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [isStaged, setIsStaged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fileType, setFileType] = useState('sale'); // Defaults to 'sale'
  const navigate = useNavigate();

  // Core Mapping Target State Hooks
  const [mapping, setMapping] = useState({
    product_name: '',
    gross_amount: '',
    invoice_number: '',
    recipient_gstin: '',
    recipient_name: '',
  });
  const autoDetectColumns = (headers) => {
  	const freshMap = {
   		product_name: '',
        gross_amount: '',
        invoice_number: '',
        invoice_date: '',
        recipient_gstin: '',
      };
  	headers.forEach((header) => {
  		const cleanHeader = header.toLowerCase().replace(/[\s_\-]/g, '');
    
    // 1. Match Product / Description Field
   		if (cleanHeader.includes('product') || cleanHeader.includes('item') || cleanHeader.includes('deliverytype') || cleanHeader.includes('description')) {
    		if (!freshMap.product_name) freshMap.product_name = header;
    	}
        // 2. Match Financial Gross Amount
    	if (cleanHeader.includes('amount') || cleanHeader.includes('price') || cleanHeader.includes('billamount') || cleanHeader.includes('gross') || cleanHeader.includes('total')) {
    		if (!freshMap.gross_amount) freshMap.gross_amount = header;
    	}
        // 3. Match Invoice / Customer ID Tracing Number
    	if (cleanHeader.includes('invoice') || cleanHeader.includes('invnum') || cleanHeader.includes('customerid') || cleanHeader.includes('docnum')) {
    		if (!freshMap.invoice_number) freshMap.invoice_number = header;
    	}
        // 4. Match Transactional Date Slugs (Resolves your Billing_Date constraint!)
    	if (cleanHeader.includes('date') || cleanHeader.includes('time') || cleanHeader.includes('billingdate') || cleanHeader.includes('timestamp')) {
    		if (!freshMap.invoice_date) freshMap.invoice_date = header;
    	}
        // 5. Match Corporate Tax Registration Strings
    	if (cleanHeader.includes('gst') || cleanHeader.includes('gstin') || cleanHeader.includes('taxid')) {
    		if (!freshMap.recipient_gstin) freshMap.recipient_gstin = header;
    	}
  	});
  	setMapping(freshMap);
};
  

  // 📁 Handle Local File Selection and In-Memory Fast Parsing
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const text = event.target.result;
      // Split entries safely into readable text rows
      const rows = text.split(/\r?\n/).filter(row => row.trim() !== '');
      
      if (rows.length > 0) {
        // Extract the very first row containing raw file headers
        const headers = rows[0].split(',').map(h => h.replace(/["']/g, "").trim());
        setCsvHeaders(headers);
        setRawRows(rows);
        setIsStaged(true); // Reveal the mapping configuration drawer panel

        autoDetectColumns(headers);
      }
    };
    reader.readAsText(selectedFile);
  };

  // 🔄 Update Specific Target Mapping Values Dynamically
  const handleMapChange = (targetColumn, chosenHeader) => {
    setMapping(prev => ({ ...prev, [targetColumn]: chosenHeader }));
  };

  // ⚡ Package Data Payload and Send to FastAPI Backend Engine
  const executeIngestPipeline = async () => {
    if (!mapping.product_name || !mapping.gross_amount) {
      alert("❌ Critical Error: Please map at least Product Name and Price columns before proceeding.");
      return;
    }

    setLoading(true);
    
    // Construct payload containing the raw file text and matching configurations
    const activeId = localStorage.getItem('activeBusinessId') || '1';
    
    const payload = {
      business_id: parseInt(activeId),
      raw_csv_text: rawRows.join('\n'),
      transaction_type: fileType, // ⚡ Dynamic state variable sent straight to backend!
      mappings: {
        product_name: mapping.product_name,
        gross_amount: mapping.gross_amount,
        invoice_number: mapping.invoice_number || "",
        invoice_date: mapping.invoice_date || "",
        recipient_gstin: mapping.recipient_gstin || ""
      }
    };
    try {
      const response = await fetch('http://127.0.0.1:8000/parse-and-import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (response.ok) {
      	let count = 0;
        try {
        	const result = await response.json();
            count = result.imported_count || 0;
        } catch (e) {
        	// Fallback if backend returns an unparsable body but status is 200 OK
          console.log("Response body parsed raw or empty:", e);
        }
      
        alert(`🎉 Success! Cleanly injected dataset into your ledger.`);
        setFile(null);
        setIsStaged(false);
        if (onImportComplete) onImportComplete();
        navigate('/tax-summary'); 
      } else {
        	alert("❌ Processing Failure: The backend rejected your data matrix schema.");
      }
    } catch (err) {
      console.error("React catch context tracking link error:", err);
      alert("❌ Interface Exception: JSON response validation crashed. Check Termux print outs.");
    } finally {
      setLoading(false);
    }
    	
  };

  return (
  	<div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
  		<h2 style={{ color: '#0F4C81', marginBottom: '8px' }}>📊 Smart Ingestion Portal</h2>
  	    <p style={{ color: '#666', fontSize: '14px', marginBottom: '24px' }}>
  	   		Review auto-detected layout rows or assign missing parameters manually through the dropdown dashboards context.
  	    </p>
  	
  	    {!isStaged ? (
  	    	<div style={{ border: '2px dashed #B2C2D2', padding: '40px 20px', borderRadius: '12px', textAlign: 'center', backgroundColor: '#F8FAFC', cursor: 'pointer' }}>
  	        	<span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>📁</span>
  	          	<label style={{ fontWeight: '600', color: '#334155', cursor: 'pointer' }}>
  	            	Click to upload your ledger file (.csv)
  	            	<input type="file" accept=".csv" onChange={handleFileChange} style={{ display: 'none' }} />
  	          	</label>
  	        </div>
  	      ) : (
  	      	<div style={{ backgroundColor: '#FFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
  	          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
  	            <span style={{ fontWeight: 'bold', color: '#1E293B' }}>📋 Verify Detected Column Maps</span>
  	            <button onClick={() => setIsStaged(false)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
  	          </div>
  	          <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
  	          	<label style={{ display: 'block', fontWeight: 'bold', fontSize: '14px', color: '#1E293B', marginBottom: '8px' }}>
  	            	📈 What type of spreadsheet are you importing?
  	            </label>
  	            <select 
  	            	value={fileType} 
  	                onChange={(e) => setFileType(e.target.value)} 
  	                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFF', fontWeight: '600' }}
  	            >
  	            	<option value="sale">🛍️ Sales Ledger (Outward Supplies / GSTR-1)</option>
  	            	<option value="purchase">🛒 Purchase Ledger (Inward Credit Supplies / GSTR-2)</option>
  	            </select>
  	          </div>
  	
  	          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
  	            
  	            {/* Required Field: Product mapping */}
  	            <div>
  	              <label style={{ display: 'block', fontWeight: '600', fontSize: '14px', color: '#475569', marginBottom: '6px' }}>
  	                Product Name Column <span style={{ color: '#EF4444' }}>*</span>
  	              </label>
  	              <select 
  	                value={mapping.product_name} 
  	                onChange={(e) => handleMapChange('product_name', e.target.value)} 
  	                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: mapping.product_name ? '1px solid #CBD5E1' : '2px solid #F59E0B', backgroundColor: mapping.product_name ? '#FFF' : '#FFFBEB' }}
  	              >
  	                <option value="">-- Missing! Please Choose Column --</option>
  	                {csvHeaders.map((h, i) => <option key={i} value={h}>{h}</option>)}
  	              </select>
  	              {mapping.product_name && <span style={{ fontSize: '12px', color: '#10B981' }}>✨ Auto-detected successfully</span>}
  	            </div>
  	
  	            {/* Required Field: Financial Gross Price */}
  	            <div>
  	              <label style={{ display: 'block', fontWeight: '600', fontSize: '14px', color: '#475569', marginBottom: '6px' }}>
  	                Gross Amount Column <span style={{ color: '#EF4444' }}>*</span>
  	              </label>
  	              <select 
  	                value={mapping.gross_amount} 
  	                onChange={(e) => handleMapChange('gross_amount', e.target.value)} 
  	                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: mapping.gross_amount ? '1px solid #CBD5E1' : '2px solid #F59E0B', backgroundColor: mapping.gross_amount ? '#FFF' : '#FFFBEB' }}
  	              >
  	                <option value="">-- Missing! Please Choose Column --</option>
  	                {csvHeaders.map((h, i) => <option key={i} value={h}>{h}</option>)}
  	              </select>
  	              {mapping.gross_amount && <span style={{ fontSize: '12px', color: '#10B981' }}>✨ Auto-detected successfully</span>}
  	            </div>
  	
  	            {/* Verification Field: Transactional Date Tracker */}
  	            <div>
  	              <label style={{ display: 'block', fontWeight: '600', fontSize: '14px', color: '#475569', marginBottom: '6px' }}>
  	                Invoice / Billing Date Column
  	              </label>
  		              <select 
  	                value={mapping.invoice_date} 
  	                onChange={(e) => handleMapChange('invoice_date', e.target.value)} 
  	                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: mapping.invoice_date ? '1px solid #CBD5E1' : '2px solid #F59E0B', backgroundColor: mapping.invoice_date ? '#FFF' : '#FFFBEB' }}
  	              >
  	                <option value="">-- Left Empty (Will fallback to standard system date cycle) --</option>
  	                {csvHeaders.map((h, i) => <option key={i} value={h}>{h}</option>)}
  	              </select>
  	              {/* 🗓️ Invoice / Billing Date Verification Status Banner */}
  	              {mapping.invoice_date ? (
  	                <span style={{ fontSize: '12px', color: '#10B981', display: 'block', marginTop: '4px' }}>
  	                  ✨ Auto-detected: Linked column "{mapping.invoice_date}"
  	                </span>
  	      ) : (
  	                <span style={{ fontSize: '12px', color: '#F59E0B', display: 'block', marginTop: '4px' }}>
  	                  ⚠️ Unresolved: Dropdown defaults to safe fallback row logs date timestamp.
  	                </span>
  	              )}
  	            </div>
            </div>

          {/* 📁 Optional Tracing Fields Container Layout Drawer */}
          <div style={{ marginTop: '16px', borderTop: '1px dashed #E2E8F0', paddingTop: '12px' }}>
  	      	<span style={{ fontSize: '11px', fontWeight: 'bold', color: '#94A3B8', display: 'block', marginBottom: '12px', textTransform: 'uppercase' }}>
  	        	Optional Tracing Parameters
  	        </span>
  	              
  	        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
  	        	{/* Optional Field: Invoice Tracking Number */}
  	        	<div>
  	            	<label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '4px' }}>
  	                	Invoice Number Column
  	                </label>
  	                <select
  	                	value={mapping.invoice_number} 
  	                    onChange={(e) => handleMapChange('invoice_number', e.target.value)} 
  	                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFF', fontSize: '13px' }}
  	                >
  	                    <option value="">-- Leave Blank (Auto-Generate Series) --</option>
  	                    {csvHeaders.map((h, i) => (
  	                      <option key={i} value={h}>{h}</option>
  	                    ))}
  	                </select>
  	            </div>

  	            {/* Optional Field: Recipient Tax Credentials String */}
  	            <div>
  	            	<label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '4px' }}>
  	                	Recipient GSTIN Column
  	                </label>
  	                <select 
  	                	value={mapping.recipient_gstin} 
  	                    onChange={(e) => handleMapChange('recipient_gstin', e.target.value)} 
  	                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFF', fontSize: '13px' }}
  	                >
  	                	<option value="">-- Leave Blank (Defaults Consumer B2C) --</option>
  	                    {csvHeaders.map((h, i) => (
  	                    	<option key={i} value={h}>{h}</option>
  	                    ))}
  	                </select>
  	            </div>
  	        </div>
          </div>

          {/* ⚡ Execution Core Control Action Ingestion Button */}
          <button
  	      	onClick={executeIngestPipeline}
  	        disabled={loading}
  	        style={{
  	        	width: '100%', marginTop: '24px', padding: '14px', borderRadius: '8px',
  	            backgroundColor: loading ? '#94A3B8' : '#10B981', color: '#FFF',
  	            border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: loading ? 'not-allowed' : 'pointer',
  	            transition: 'background-color 0.2s'
  	        }}
          >
  	      	{loading ? 'Ingesting Verified Dataset Matrix...' : '⚡ Ingest & Complete Mapping'}
          </button>

          
        </div>
      )}
    </div>
    
  );
}

