import { Link } from 'react-router-dom';

const GITHUB_URL = 'https://github.com/fuatyazar/aiflow';

const WORKFLOW_STEPS = [
  { icon: '💬', label: 'Describe', desc: 'Describe your workflow in plain language' },
  { icon: '✨', label: 'Generate', desc: 'AI generates a structured workflow graph' },
  { icon: '✏️', label: 'Design', desc: 'Edit nodes, connections, and configuration' },
  { icon: '▶', label: 'Simulate', desc: 'Step-by-step execution with full trace' },
  { icon: '📊', label: 'Evaluate', desc: 'AI scores the workflow and recommends improvements' },
];

const NODE_TYPES = [
  { type: 'LLM', color: '#7c6af7', desc: 'Language model calls' },
  { type: 'TOOL', color: '#f7a24a', desc: 'External tool integrations' },
  { type: 'API', color: '#4af7c4', desc: 'HTTP API calls' },
  { type: 'RAG', color: '#f74a8a', desc: 'Retrieval-augmented generation' },
  { type: 'CONDITION', color: '#f7e24a', desc: 'Branching logic' },
  { type: 'HITL', color: '#4a8af7', desc: 'Human-in-the-loop review' },
  { type: 'DATABASE', color: '#a24af7', desc: 'Database queries' },
  { type: 'TRANSFORM', color: '#4af74a', desc: 'Data transformation' },
];

const EXAMPLE_WORKFLOWS = [
  {
    name: 'Customer Support Agent',
    steps: ['User Question', 'Classify Request', 'Retrieve Knowledge', 'Generate Response', 'Human Approval'],
  },
  {
    name: 'Document Analysis',
    steps: ['Document Input', 'Extract Information', 'Analyze Content', 'Validate', 'Generate Report'],
  },
  {
    name: 'Review Pipeline',
    steps: ['Collect Reviews', 'Sentiment Analysis', 'Extract Issues', 'Summarize', 'Human Review'],
  },
];

const TECH_STACK = [
  { layer: 'Frontend', items: ['React 19', 'TypeScript', 'Vite', 'React Flow'] },
  { layer: 'Backend', items: ['Python', 'FastAPI', 'Pydantic', 'LangChain'] },
  { layer: 'AI / LLM', items: ['OpenAI GPT-4o', 'Provider-agnostic interface', 'Structured output'] },
  { layer: 'Infra', items: ['AWS Lambda', 'AWS Amplify', 'Supabase', 'PostgreSQL + RLS'] },
];

export default function LandingPage() {
  return (
    <div className="landing">
      {/* ── Nav ── */}
      <nav className="landing-nav">
        <div className="landing-nav-brand">
          <span className="landing-logo-icon">⬡</span>
          <span>AiFlow</span>
        </div>
        <div className="landing-nav-links">
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">GitHub</a>
          <Link to="/login" className="landing-nav-login">Sign in</Link>
          <Link to="/request-access" className="landing-nav-cta">Request access</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-badge">Private access · Portfolio project</div>
          <h1 className="landing-hero-title">
            Visual tooling for<br />
            <span className="landing-hero-accent">agentic AI workflows</span>
          </h1>
          <p className="landing-hero-sub">
            AiFlow is a developer environment for designing, simulating, and evaluating
            multi-step AI workflows — built as an exploration of developer tooling for agentic systems.
          </p>
          <div className="landing-hero-actions">
            <Link to="/request-access" className="landing-btn-primary">
              Request demo access
            </Link>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="landing-btn-secondary">
              View on GitHub
            </a>
          </div>
        </div>
        <div className="landing-hero-visual">
          <WorkflowVisual />
        </div>
      </section>

      {/* ── Problem ── */}
      <section className="landing-section landing-section-alt">
        <div className="landing-container">
          <h2>The problem with agentic AI development</h2>
          <div className="landing-problem-grid">
            <div className="landing-problem-card">
              <span className="landing-problem-icon">👁</span>
              <h3>No visibility</h3>
              <p>Agentic systems are hard to reason about. You write code, run it, and hope it does what you think it does.</p>
            </div>
            <div className="landing-problem-card">
              <span className="landing-problem-icon">🔁</span>
              <h3>Slow iteration</h3>
              <p>Changing a single node means re-running the entire chain. Every small change is expensive to test.</p>
            </div>
            <div className="landing-problem-card">
              <span className="landing-problem-icon">📄</span>
              <h3>Locked in code</h3>
              <p>The workflow structure lives only in code. You can't quickly share it, explain it, or review it visually.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="landing-section">
        <div className="landing-container">
          <h2>How AiFlow works</h2>
          <p className="landing-section-sub">Five stages from idea to evaluated workflow.</p>
          <div className="landing-pipeline">
            {WORKFLOW_STEPS.map((step, i) => (
              <div key={step.label} className="landing-pipeline-step">
                <div className="landing-pipeline-icon">{step.icon}</div>
                <div className="landing-pipeline-label">{step.label}</div>
                <div className="landing-pipeline-desc">{step.desc}</div>
                {i < WORKFLOW_STEPS.length - 1 && <div className="landing-pipeline-arrow">→</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Node types ── */}
      <section className="landing-section landing-section-alt">
        <div className="landing-container">
          <h2>Built for real agentic patterns</h2>
          <p className="landing-section-sub">
            AiFlow understands the building blocks of modern AI systems.
          </p>
          <div className="landing-nodes-grid">
            {NODE_TYPES.map(n => (
              <div key={n.type} className="landing-node-chip" style={{ borderColor: n.color }}>
                <span className="landing-node-dot" style={{ background: n.color }} />
                <span className="landing-node-type">{n.type}</span>
                <span className="landing-node-desc">{n.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Example workflows ── */}
      <section className="landing-section">
        <div className="landing-container">
          <h2>Example workflows</h2>
          <p className="landing-section-sub">
            Generate any of these with a single sentence description.
          </p>
          <div className="landing-examples-grid">
            {EXAMPLE_WORKFLOWS.map(wf => (
              <div key={wf.name} className="landing-example-card">
                <h3>{wf.name}</h3>
                <ol className="landing-example-steps">
                  {wf.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tech stack ── */}
      <section className="landing-section landing-section-alt">
        <div className="landing-container">
          <h2>Technology</h2>
          <div className="landing-tech-grid">
            {TECH_STACK.map(t => (
              <div key={t.layer} className="landing-tech-card">
                <div className="landing-tech-layer">{t.layer}</div>
                <ul>
                  {t.items.map(item => <li key={item}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="landing-section landing-cta-section">
        <div className="landing-container landing-cta-container">
          <h2>Request access</h2>
          <p>
            AiFlow is in private access. Submit a request and I'll review it personally.
          </p>
          <div className="landing-hero-actions">
            <Link to="/request-access" className="landing-btn-primary">
              Request demo access
            </Link>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="landing-btn-secondary">
              Browse the code
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <span>
            <span className="landing-logo-icon">⬡</span> AiFlow — built by Fuat Yazar
          </span>
          <div className="landing-footer-links">
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">GitHub</a>
            <Link to="/request-access">Request access</Link>
            <Link to="/login">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function WorkflowVisual() {
  const nodes = [
    { id: 'start', label: 'START', x: 140, y: 10, color: '#4af7c4' },
    { id: 'llm', label: 'LLM', x: 60, y: 90, color: '#7c6af7' },
    { id: 'cond', label: 'CONDITION', x: 220, y: 90, color: '#f7e24a' },
    { id: 'tool', label: 'TOOL', x: 140, y: 170, color: '#f7a24a' },
    { id: 'end', label: 'END', x: 140, y: 250, color: '#f74a8a' },
  ];
  const edges = [
    { from: 'start', to: 'llm' },
    { from: 'start', to: 'cond' },
    { from: 'llm', to: 'tool' },
    { from: 'cond', to: 'tool' },
    { from: 'tool', to: 'end' },
  ];
  const nodeMap: Record<string, { x: number; y: number }> = {};
  nodes.forEach(n => { nodeMap[n.id] = { x: n.x + 44, y: n.y + 16 }; });

  return (
    <div className="landing-hero-diagram">
      <svg viewBox="0 0 320 300" width="320" height="300">
        {edges.map((e, i) => (
          <line
            key={i}
            x1={nodeMap[e.from].x} y1={nodeMap[e.from].y}
            x2={nodeMap[e.to].x} y2={nodeMap[e.to].y}
            stroke="rgba(255,255,255,0.2)" strokeWidth="2"
          />
        ))}
        {nodes.map(n => (
          <g key={n.id} transform={`translate(${n.x},${n.y})`}>
            <rect
              width="88" height="32" rx="6"
              fill="rgba(255,255,255,0.06)"
              stroke={n.color}
              strokeWidth="1.5"
            />
            <text
              x="44" y="21"
              textAnchor="middle"
              fill={n.color}
              fontSize="11"
              fontFamily="monospace"
              fontWeight="600"
            >
              {n.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
