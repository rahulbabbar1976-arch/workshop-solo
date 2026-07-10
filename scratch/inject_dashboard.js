const fs = require('fs');
const pagePath = 'src/app/owner/page.tsx';
let content = fs.readFileSync(pagePath, 'utf-8');

const insertPoint = `      {/* ================= TAB 1: JOB CARDS CONTROL CENTER ================= */}
      {activeTab === 'jobs' && (
        <div>`;

const dashboardBlock = `      {/* ================= COMMAND CENTRE DASHBOARD ================= */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Header Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', background: 'linear-gradient(90deg, #6366f1, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                🤖 BABBARSONS Command Centre
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>Live business intelligence for your workshop</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <input
                type="month"
                className="form-control"
                value={dashboardMonth}
                onChange={(e) => { setDashboardMonth(e.target.value); fetchDashboard(e.target.value); }}
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', width: '160px' }}
              />
              <button className="btn btn-secondary" onClick={() => fetchDashboard()} style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>
                🔄 Refresh
              </button>
            </div>
          </div>

          {dashboardLoading && (
            <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
              Loading business intelligence...
            </div>
          )}

          {dashboardData && !dashboardLoading && (
            <>
              {/* KPI Cards Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                {[
                  { label: 'Today Revenue', value: \`₹\${(dashboardData.kpis.revenueToday || 0).toLocaleString()}\`, icon: '💰', color: '#10b981' },
                  { label: 'Week Revenue', value: \`₹\${(dashboardData.kpis.revenueWeek || 0).toLocaleString()}\`, icon: '📅', color: '#06b6d4' },
                  { label: 'Month Revenue', value: \`₹\${(dashboardData.kpis.revenueMonth || 0).toLocaleString()}\`, icon: '📈', color: '#6366f1' },
                  { label: 'Gross Profit', value: \`₹\${(dashboardData.kpis.grossProfit || 0).toLocaleString()}\`, icon: '💹', color: '#f59e0b' },
                  { label: 'Gross Margin', value: \`\${dashboardData.kpis.grossMarginPct || 0}%\`, icon: '🎯', color: '#8b5cf6' },
                  { label: 'Jobs Closed', value: dashboardData.kpis.totalJobsMonth || 0, icon: '✅', color: '#10b981' },
                ].map((kpi, i) => (
                  <div key={i} className="glass-card" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{kpi.icon}</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{kpi.label}</div>
                    <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '4rem', opacity: 0.05 }}>{kpi.icon}</div>
                  </div>
                ))}
              </div>

              {/* GST Panel */}
              <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(6,182,212,0.05))', border: '1px solid rgba(16,185,129,0.2)' }}>
                <h3 style={{ margin: '0 0 1rem 0', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🏛️ GST Summary — {dashboardMonth}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                  {[
                    { label: 'CGST Collected', value: \`₹\${(dashboardData.kpis.cgstCollected || 0).toLocaleString()}\`, color: '#6366f1' },
                    { label: 'SGST Collected', value: \`₹\${(dashboardData.kpis.sgstCollected || 0).toLocaleString()}\`, color: '#06b6d4' },
                    { label: 'Total GST Out', value: \`₹\${(dashboardData.kpis.totalGSTCollected || 0).toLocaleString()}\`, color: '#10b981' },
                    { label: 'Input Credit (Est.)', value: \`₹\${(dashboardData.kpis.inputGSTCredit || 0).toLocaleString()}\`, color: '#f59e0b' },
                    { label: '⚠️ Net GST Payable', value: \`₹\${(dashboardData.kpis.netGSTPayable || 0).toLocaleString()}\`, color: '#ef4444' },
                    { label: 'Parts Purchased', value: \`₹\${(dashboardData.kpis.totalPurchaseCost || 0).toLocaleString()}\`, color: '#8b5cf6' },
                  ].map((item, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: item.color }}>{item.value}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{item.label}</div>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '1rem', padding: '0.5rem', background: 'rgba(234,179,8,0.05)', borderRadius: '6px', border: '1px solid rgba(234,179,8,0.15)' }}>
                  ⚠️ Input credit is estimated at 18% GST on purchases. Consult your CA for precise ITC claims.
                </p>
              </div>

              {/* Job Funnel + Top Lists */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem' }}>
                <div className="glass-card" style={{ padding: '1.25rem' }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: 'var(--primary)' }}>🔄 Live Job Funnel</h4>
                  {[
                    { key: 'open', label: 'Open', color: '#06b6d4' },
                    { key: 'in_progress', label: 'In Progress', color: '#8b5cf6' },
                    { key: 'waiting_for_parts', label: 'Waiting Parts', color: '#f59e0b' },
                    { key: 'ready_for_review', label: 'For Review', color: '#6366f1' },
                    { key: 'ready_for_delivery', label: 'For Delivery', color: '#10b981' },
                  ].map(s => {
                    const count = dashboardData.funnel[s.key] || 0;
                    const maxCount = Math.max(...Object.values(dashboardData.funnel).map(Number), 1);
                    return (
                      <div key={s.key} style={{ marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                          <span style={{ fontWeight: 700, color: s.color }}>{count}</span>
                        </div>
                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px' }}>
                          <div style={{ height: '100%', width: count > 0 ? Math.max(5, (count / maxCount) * 100) + '%' : '0%', background: s.color, borderRadius: '3px', transition: 'width 0.5s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                  <button className="btn btn-secondary" onClick={() => setActiveTab('jobs')} style={{ marginTop: '1rem', fontSize: '0.75rem', padding: '0.4rem 0.75rem', width: '100%' }}>
                    Open Job Cards →
                  </button>
                </div>

                <div className="glass-card" style={{ padding: '1.25rem' }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: '#f59e0b' }}>⭐ Top Customers This Month</h4>
                  {dashboardData.topCustomers.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>No closed jobs yet this month.</p>
                  ) : dashboardData.topCustomers.map((c: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ fontSize: '0.85rem', color: '#fff' }}>{i + 1}. {c.name}</span>
                      <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 700 }}>₹{c.revenue.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className="glass-card" style={{ padding: '1.25rem' }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: '#8b5cf6' }}>🔧 Mechanic Leaderboard</h4>
                  {dashboardData.mechanicPerf.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>No data this month.</p>
                  ) : dashboardData.mechanicPerf.map((m: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div>
                        <div style={{ fontSize: '0.85rem', color: '#fff' }}>{m.name || 'Unassigned'}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{m.jobs} jobs closed</div>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: '#8b5cf6', fontWeight: 700 }}>₹{m.revenue.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alerts */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="glass-card" style={{ padding: '1.25rem', border: dashboardData.lowStock.length > 0 ? '1px solid rgba(239,68,68,0.3)' : undefined }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    📦 Low Stock Alerts
                    {dashboardData.lowStock.length > 0 && <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.7rem', padding: '0.1rem 0.45rem', borderRadius: '10px' }}>{dashboardData.lowStock.length}</span>}
                  </h4>
                  {dashboardData.lowStock.length === 0 ? (
                    <p style={{ color: '#10b981', fontSize: '0.85rem' }}>✅ All parts adequately stocked.</p>
                  ) : dashboardData.lowStock.slice(0, 6).map((p: any) => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.8rem' }}>
                      <span style={{ color: '#fff' }}>{p.partName}</span>
                      <span style={{ color: '#ef4444', fontWeight: 700 }}>{p.stockQuantity}/{p.safetyStock}</span>
                    </div>
                  ))}
                </div>

                <div className="glass-card" style={{ padding: '1.25rem', border: dashboardData.vehicleAlerts.length > 0 ? '1px solid rgba(234,179,8,0.3)' : undefined }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🚗 Vehicle Alerts (30 Days)
                    {dashboardData.vehicleAlerts.length > 0 && <span style={{ background: '#f59e0b', color: '#000', fontSize: '0.7rem', padding: '0.1rem 0.45rem', borderRadius: '10px' }}>{dashboardData.vehicleAlerts.length}</span>}
                  </h4>
                  {dashboardData.vehicleAlerts.length === 0 ? (
                    <p style={{ color: '#10b981', fontSize: '0.85rem' }}>✅ No expiring documents in 30 days.</p>
                  ) : dashboardData.vehicleAlerts.map((v: any) => (
                    <div key={v.id} style={{ padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.8rem' }}>
                      <div style={{ color: '#fff', fontWeight: 600 }}>{v.registrationNumberRaw}</div>
                      <div style={{ color: '#f59e0b', fontSize: '0.7rem' }}>
                        {v.insuranceExpiryDate && \`Ins: \${new Date(v.insuranceExpiryDate).toLocaleDateString()}\`}
                        {v.nextPucDate && \` · PUC: \${new Date(v.nextPucDate).toLocaleDateString()}\`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {dashboardData.suppliers.length > 0 && (
                <div className="glass-card" style={{ padding: '1.25rem' }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: '#06b6d4' }}>🏭 Supplier Balances</h4>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {dashboardData.suppliers.map((s: any) => (
                      <div key={s.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem 1.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: s.outstandingBalance > 0 ? '#ef4444' : '#10b981' }}>₹{Math.abs(s.outstandingBalance).toLocaleString()}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{s.name}</div>
                        <div style={{ fontSize: '0.7rem', color: s.outstandingBalance > 0 ? '#ef4444' : '#10b981' }}>{s.outstandingBalance > 0 ? '⚠️ Payable' : '✅ Clear'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {!dashboardData && !dashboardLoading && (
            <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
              <p style={{ color: 'var(--text-secondary)' }}>Click Refresh to load your Command Centre.</p>
              <button className="btn btn-primary" onClick={() => fetchDashboard()} style={{ marginTop: '1rem' }}>Load Dashboard</button>
            </div>
          )}
        </div>
      )}

      `;

if (content.includes(insertPoint)) {
  content = content.replace(insertPoint, dashboardBlock + insertPoint);
  fs.writeFileSync(pagePath, content);
  console.log('Dashboard tab inserted successfully.');
} else {
  console.log('Insert point NOT found. Searching...');
  const idx = content.indexOf('activeTab === \'jobs\'');
  console.log('jobs tab idx:', idx);
}
