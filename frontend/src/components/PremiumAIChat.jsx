import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

export default function PremiumAIChat({ user, userRole, setCurrentTab }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [aiEnabled, setAiEnabled] = useState(true);
  const messagesEndRef = useRef(null);

  // Determine persona details based on role
  const isFounder = userRole === 'Founder';
  const assistantTitle = isFounder ? 'Startup AI Advisor' : 'Investment AI Analyst';
  const assistantSubtitle = isFounder 
    ? 'Expert strategic guidance for business proposals & fundraising' 
    : 'In-depth due diligence, risk profiling, & startup comparisons';
  const assistantIcon = isFounder ? '🚀' : '📊';
  const accentColor = isFounder ? 'var(--accent-primary)' : 'var(--accent-cyan)';

  const presets = isFounder ? [
    { label: 'Review my proposals', prompt: 'Please review my active proposals and suggest key improvements.' },
    { label: 'Refine business model', prompt: 'How can I optimize my business revenue model and unit economics?' },
    { label: 'Create investor summary', prompt: 'Draft a short, compelling investor-ready summary of my startup idea.' },
    { label: 'Fundraising strategy', prompt: 'What is the best fundraising strategy for a pre-seed startup in my sector?' }
  ] : [
    { label: 'Compare top startups', prompt: 'Compare the active startups on the platform by industry and requested amount.' },
    { label: 'Analyze market risks', prompt: 'What are the main risks (technical, market, regulatory) in the current proposals?' },
    { label: 'De-risk with Trust Scores', prompt: 'How should I interpret Trust Scores for early-stage startup verification?' },
    { label: 'Investment opportunities', prompt: 'Which active proposals show the strongest alignment and ROI potential?' }
  ];

  useEffect(() => {
    checkSubscriptionStatus();
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const checkSubscriptionStatus = async () => {
    setCheckingSubscription(true);
    try {
      const myData = await api.get('/subscription/my');
      setIsPremium(myData.hasActive);
      
      // Also check platform config if AI is enabled
      const configs = await api.get('/admin/subscriptions/config').catch(() => null);
      if (configs) {
        const aiConfig = configs.find(c => c.key === 'AIAssistantEnabled' || c.Key === 'AIAssistantEnabled');
        if (aiConfig && (aiConfig.value === 'false' || aiConfig.Value === 'false')) {
          setAiEnabled(false);
        }
      }

      // Add welcoming message
      if (myData.hasActive) {
        setMessages([
          {
            id: 'welcome',
            sender: 'ai',
            text: `Hello ${user?.fullName || 'there'}! I am your **${assistantTitle}**.\n\n${
              isFounder 
                ? 'I can help you review your pitch decks, improve your proposal descriptions, analyze business models, or suggest targeted fundraising strategies. Let me know what you are working on today.' 
                : 'I can analyze the startup landscape, evaluate risk profiles, clarify business models, and assist in your investment decisions. What would you like to review?'
            }`,
            time: new Date()
          }
        ]);
      }
    } catch (err) {
      console.error('Failed to verify subscription', err);
      setIsPremium(false);
    } finally {
      setCheckingSubscription(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (textToSend) => {
    const promptText = textToSend || input;
    if (!promptText.trim() || loading) return;

    if (!textToSend) {
      setInput('');
    }

    // Add user message
    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: promptText,
      time: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const endpoint = isFounder ? '/ai-assistant/founder' : '/ai-assistant/investor';
      const data = await api.post(endpoint, { prompt: promptText });
      
      // Add AI response
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: data.response,
        time: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: `⚠️ **Error:** ${err.message || 'The AI Assistant is currently unavailable. Please try again later.'}`,
          time: new Date()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Basic formatter to translate bold text and line breaks to HTML safely
  const formatMessageText = (text) => {
    if (!text) return '';
    
    // Escape HTML first to prevent XSS
    let formatted = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Handle **bold**
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Handle * bullet points
    formatted = formatted.replace(/^\s*•\s*(.*?)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/^\s*\*\s*(.*?)$/gm, '<li>$1</li>');
    
    // Wrap consecutive list items in <ul> tags
    formatted = formatted.replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>');

    // Handle newlines
    formatted = formatted.replace(/\n/g, '<br />');

    return <div dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  if (checkingSubscription) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px', height: '50px', border: '3px solid rgba(99, 102, 241, 0.1)',
            borderTopColor: accentColor, borderRadius: '50%',
            animation: 'spin 1s linear infinite', margin: '0 auto 1rem'
          }} />
          <p style={{ color: 'var(--text-secondary)' }}>Verifying subscription access...</p>
        </div>
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
        <div className="auth-card" style={{ maxWidth: '500px', width: '100%', textAlign: 'center', padding: '3rem 2rem', background: 'linear-gradient(135deg, rgba(30,41,59,0.7), rgba(15,23,42,0.9))' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🤖</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem', background: 'linear-gradient(135deg, #6366f1, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            AI Assistant Gate
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: '1.6' }}>
            Our advanced AI Startup Advisor and Investment Analyst models are exclusive benefits for **Premium** members. Unlock reviews, pitches, risk audits, and strategic advice.
          </p>
          <button 
            className="btn btn-primary btn-full" 
            style={{ padding: '0.8rem', fontWeight: 600, fontSize: '0.95rem', background: 'linear-gradient(90deg, #6366f1, #06b6d4)', border: 'none', borderRadius: '8px' }}
            onClick={() => setCurrentTab('subscription')}
          >
            Upgrade to Premium
          </button>
        </div>
      </div>
    );
  }

  if (!aiEnabled) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
        <div className="auth-card" style={{ maxWidth: '500px', width: '100%', textAlign: 'center', padding: '2.5rem', background: 'var(--bg-secondary)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚙️</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>AI Assistant Offline</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            The administrator has temporarily disabled the AI Assistant services for platform maintenance. Please check back later.
          </p>
          <button className="btn btn-secondary" onClick={() => setCurrentTab('overview')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--navbar-height) - 3.5rem)', maxWidth: '1100px' }}>
      
      {/* Advisor Header Card */}
      <div style={{ 
        background: 'linear-gradient(135deg, rgba(20,20,35,0.4), rgba(10,10,20,0.6))',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ 
          width: '46px', height: '46px', borderRadius: '10px',
          background: `linear-gradient(135deg, #6366f1, #06b6d4)`,
          display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center',
          fontSize: '1.5rem', boxShadow: '0 4px 15px rgba(99,102,241,0.25)'
        }}>
          {assistantIcon}
        </div>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {assistantTitle}
            <span style={{ fontSize: '0.625rem', padding: '0.15rem 0.5rem', borderRadius: '99px', background: `${accentColor}18`, border: `1px solid ${accentColor}44`, color: accentColor, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Premium AI
            </span>
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
            {assistantSubtitle}
          </p>
        </div>
      </div>

      {/* Main Chat Interface Grid */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        background: 'var(--bg-card)', 
        border: '1px solid var(--border-color)', 
        borderRadius: '12px', 
        overflow: 'hidden',
        boxShadow: 'var(--shadow-md)'
      }}>
        
        {/* Messages Scroll Area */}
        <div style={{ 
          flex: 1, 
          padding: '1.5rem', 
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              style={{
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start'
              }}
            >
              <div style={{
                background: msg.sender === 'user' ? accentColor : 'rgba(255,255,255,0.03)',
                color: msg.sender === 'user' ? '#fff' : 'var(--text-primary)',
                border: msg.sender === 'user' ? 'none' : '1px solid var(--border-color)',
                padding: '0.9rem 1.2rem',
                borderRadius: msg.sender === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                fontSize: '0.875rem',
                lineHeight: '1.6',
                boxShadow: msg.sender === 'user' ? `0 2px 8px ${accentColor}25` : 'none'
              }}>
                {formatMessageText(msg.text)}
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px', padding: '0 4px' }}>
                {msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}

          {loading && (
            <div style={{ alignSelf: 'flex-start', display: 'flex', flexDirection: 'column' }}>
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-color)',
                padding: '0.9rem 1.2rem',
                borderRadius: '14px 14px 14px 2px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <div style={{ width: '8px', height: '8px', background: accentColor, borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both' }} />
                <div style={{ width: '8px', height: '8px', background: accentColor, borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.2s' }} />
                <div style={{ width: '8px', height: '8px', background: accentColor, borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.4s' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Presets and Input Area */}
        <div style={{ 
          padding: '1.25rem', 
          borderTop: '1px solid var(--border-color)',
          background: 'rgba(0,0,0,0.1)'
        }}>
          
          {/* Quick presets (only show when no user messages sent yet) */}
          {messages.length <= 1 && !loading && (
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
                Suggested Topics:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {presets.map((preset, index) => (
                  <button
                    key={index}
                    onClick={() => handleSend(preset.prompt)}
                    className="btn btn-secondary"
                    style={{ 
                      fontSize: '0.78rem', 
                      padding: '0.4rem 0.8rem', 
                      borderRadius: '20px', 
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-color)',
                      margin: 0
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form Input */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            style={{ display: 'flex', gap: '0.75rem' }}
          >
            <input
              type="text"
              className="form-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask the AI ${isFounder ? 'Founder' : 'Investor'} Assistant anything...`}
              disabled={loading}
              style={{ flex: 1, margin: 0, padding: '0.75rem 1rem', borderRadius: '8px' }}
            />
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading || !input.trim()}
              style={{ 
                margin: 0, 
                padding: '0 1.25rem', 
                borderRadius: '8px',
                background: accentColor,
                borderColor: accentColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {loading ? 'Thinking...' : 'Send'}
            </button>
          </form>
        </div>
      </div>
      
      {/* Bounce keyframe styles */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1.0); }
        }
      `}</style>
    </div>
  );
}
