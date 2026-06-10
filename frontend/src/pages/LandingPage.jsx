import React from 'react';
import './LandingPage.css';

export default function LandingPage({ onGetStarted }) {
  return (
    <div className="landing-container">
      {/* Navbar */}
      <header className="landing-navbar">
        <div className="landing-logo">
          <span className="logo-icon">🏛️</span>
          <h2>Governance<span className="text-accent">Platform</span></h2>
        </div>
        <div className="landing-nav-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it Works</a>
          <button className="btn btn-primary" onClick={onGetStarted}>Sign In</button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="hero-content">
          <div className="hero-badge">Next-Gen Capital Allocation</div>
          <h1 className="hero-title">
            The Future of <br />
            <span className="text-gradient">Proposal Governance</span>
          </h1>
          <p className="hero-subtitle">
            A comprehensive ecosystem connecting visionary founders, meticulous reviewers, and strategic investors through AI-driven evaluation and secure capital deployment.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary btn-large" onClick={onGetStarted}>
              Get Started Now
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft: '8px'}}><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
            </button>
            <button className="btn btn-outline btn-large">View Documentation</button>
          </div>
          
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-value">50M+</span>
              <span className="stat-label">Capital Deployed</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">1,200+</span>
              <span className="stat-label">Startups Funded</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">99.9%</span>
              <span className="stat-label">Platform Uptime</span>
            </div>
          </div>
        </div>
        <div className="hero-image-container">
          <img src="/hero_governance.png" alt="Platform Governance Network" className="hero-image" />
          <div className="floating-card card-1">
            <div className="card-header">
              <div className="icon-box blue">AI</div>
              <span>Trust Score Updated</span>
            </div>
            <p>Score: 92/100 (Exceptional)</p>
          </div>
          <div className="floating-card card-2">
            <div className="card-header">
              <div className="icon-box green">✓</div>
              <span>Patent Verified</span>
            </div>
            <p>USPTO Database Match</p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="landing-features">
        <div className="section-header">
          <h2>Unified Ecosystem for All Stakeholders</h2>
          <p>Everything you need to raise capital, evaluate deals, and deploy funds.</p>
        </div>
        
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon founder">🚀</div>
            <h3>For Founders</h3>
            <p>Submit proposals, run AI-driven pitch simulations, verify your patents automatically, and build an immutable trust score.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon reviewer">📋</div>
            <h3>For Reviewers</h3>
            <p>Access streamlined evaluation queues, detailed technical due diligence reports, and earn platform reputation.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon investor">💼</div>
            <h3>For Investors</h3>
            <p>Discover high-potential startups with verified data, co-invest with syndicates, and track portfolio performance.</p>
          </div>
        </div>
      </section>

      
      {/* How It Works Section */}
      <section id="how-it-works" className="landing-how-it-works">
        <div className="section-header">
          <h2>How It Works</h2>
          <p>From initial submission to final capital deployment, our process is secure and transparent.</p>
        </div>
        
        <div className="steps-container">
          <div className="step-item">
            <div className="step-number">1</div>
            <h3>Submit</h3>
            <p>Founders upload business proposals, technical documentation, and patent data to the secure vault.</p>
          </div>
          <div className="step-item">
            <div className="step-number">2</div>
            <h3>Analyze</h3>
            <p>Our proprietary AI immediately analyzes the submission to generate an immutable initial Trust Score.</p>
          </div>
          <div className="step-item">
            <div className="step-number">3</div>
            <h3>Review</h3>
            <p>Human domain experts perform deep technical due diligence and validate the AI's initial findings.</p>
          </div>
          <div className="step-item">
            <div className="step-number">4</div>
            <h3>Fund</h3>
            <p>Investors review the verified data room and securely deploy capital into the best opportunities.</p>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="landing-trust">
        <div className="trust-content">
          <h2>Powered by Advanced AI & Blockchain Verification</h2>
          <p>
            Our proprietary engine cross-references millions of data points to generate actionable insights, mitigating risk before a single dollar is deployed.
          </p>
          <ul className="trust-list">
            <li><span>✓</span> Automated Patent & IP Verification</li>
            <li><span>✓</span> Real-time AI Proposal Analysis</li>
            <li><span>✓</span> Immutable Audit Trails</li>
            <li><span>✓</span> Bank-grade Security Standards</li>
          </ul>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <span className="logo-icon">🏛️</span>
            <h3>Governance Platform</h3>
            <p>Defining the standard for secure, transparent capital allocation.</p>
          </div>
          <div className="footer-links">
            <div className="link-group">
              <h4>Platform</h4>
              <a href="#">Founders</a>
              <a href="#">Investors</a>
              <a href="#">Reviewers</a>
            </div>
            <div className="link-group">
              <h4>Resources</h4>
              <a href="#">Documentation</a>
              <a href="#">API Reference</a>
              <a href="#">Help Center</a>
            </div>
            <div className="link-group">
              <h4>Company</h4>
              <a href="#">About</a>
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 Proposal Governance Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
