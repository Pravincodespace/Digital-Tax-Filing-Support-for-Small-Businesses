import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, Cell } from 'recharts';

export default function AnalyticsView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const activeId = localStorage.getItem('activeBusinessId') || '1';
  const COLORS = ['#0F4C81', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/business-analytics-v1?business_id=${activeId}`)
      .then(res => res.json())
      .then(resData => {
        if (resData.success) setData(resData);
        setLoading(false);
      })
      .catch(err => {
        console.error("Analytics fetch crashed:", err);
        setLoading(false);
      });
  }, [activeId]);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>⏳ Loading Real-Time Analytics Matrix...</div>;
  if (!data) return <div style={{ padding: '40px', textAlign: 'center', color: '#EF4444' }}>❌ Failed to connect to analytics background server engines.</div>;

  const { summary, trends, slabs } = data;

  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif', maxWidth: '1200px', margin: '0 auto', backgroundColor: '#F8FAFC' }}>
      <h2 style={{ color: '#0F4C81', margin: '0 0 4px 0' }}>📈 Business Intelligence Analytics Workspace</h2>
      <p style={{ color: '#64748B', fontSize: '14px', margin: '0 0 24px 0' }}>Real-time transaction flows and automated statutory GST pool breakdowns.</p>

      {/* 📊 Row Component Layout: Performance Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#FFF', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span style={{ color: '#64748B', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Gross Sales (Incomes)</span>
          <h3 style={{ color: '#10B981', fontSize: '24px', margin: '8px 0 0 0' }}>₹{summary.gross_sales.toLocaleString('en-IN')}</h3>
        </div>
        <div style={{ backgroundColor: '#FFF', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span style={{ color: '#64748B', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Gross Purchases (Expenses)</span>
          <h3 style={{ color: '#EF4444', fontSize: '24px', margin: '8px 0 0 0' }}>₹{summary.gross_purchases.toLocaleString('en-IN')}</h3>
        </div>
        <div style={{ backgroundColor: '#FFF', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span style={{ color: '#64748B', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Net Margin Pool</span>
          <h3 style={{ color: summary.net_margin >= 0 ? '#0F4C81' : '#EF4444', fontSize: '24px', margin: '8px 0 0 0' }}>₹{summary.net_margin.toLocaleString('en-IN')}</h3>
        </div>
        <div style={{ backgroundColor: '#FFF', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span style={{ color: '#64748B', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Total GST Liability</span>
          <h3 style={{ color: '#F59E0B', fontSize: '24px', margin: '8px 0 0 0' }}>₹{summary.tax_breakdown.total_liability.toLocaleString('en-IN')}</h3>
        </div>
      </div>

      {/* 📈 Row Component Layout: Visual Charts Grid Panels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
        
        {/* Interactive Element: Operational Cash Flow Area Curve Chart */}
        <div style={{ backgroundColor: '#FFF', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h4 style={{ color: '#1E293B', margin: '0 0 16px 0', fontSize: '16px' }}>📊 Operational Cash Flow Trends (Monthly)</h4>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <AreaChart data={trends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" stroke="#94A3B8" style={{ fontSize: '12px' }} />
                <YAxis stroke="#94A3B8" style={{ fontSize: '12px' }} />
                <Tooltip formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, '']} />
                <Legend />
                <Area type="monotone" dataKey="sales" name="Sales (Inward Flow)" stroke="#10B981" fill="#E6F4EA" strokeWidth={2} />
                <Area type="monotone" dataKey="purchases" name="Purchases (Outward Credit)" stroke="#EF4444" fill="#FCE8E6" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Interactive Element: Inventory Tax Slab Distribution Chart */}
        <div style={{ backgroundColor: '#FFF', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h4 style={{ color: '#1E293B', margin: '0 0 16px 0', fontSize: '16px' }}>🏷️ Volume Distribution Mapped Across GST Slabs</h4>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={slabs} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" stroke="#94A3B8" style={{ fontSize: '12px' }} />
                <YAxis stroke="#94A3B8" style={{ fontSize: '12px' }} />
                <Tooltip formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Taxable Base']} />
                <Bar dataKey="value" name="Taxable Value pool" radius={[4, 4, 0, 0]}>
                  {slabs.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}

