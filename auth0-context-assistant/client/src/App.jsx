import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_BASE || "";

function useDemoAuth() {
  return {
    isAuthenticated: true,
    isLoading: false,
    loginWithRedirect: () => {},
    logout: () => {},
    getAccessTokenSilently: async () => "demo-token",
    user: {
      name: "Rahul Singh",
      email: "rahulsinghx2001@gmail.com",
      sub: "auth0|demo-rahul",
    },
  };
}

export default function App({ demoMode }) {
  const auth0 = demoMode
    ? useDemoAuth()
    : useAuth0();
  const { isAuthenticated, isLoading, loginWithRedirect, logout, getAccessTokenSilently, user } = auth0;

  const [settings, setSettings] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("What's the weather like for my usual city?");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const api = useMemo(() => {
    return async (path, options = {}) => {
      const token = await getAccessTokenSilently();
      const res = await fetch(`${API}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(options.headers || {}),
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data;
    };
  }, [getAccessTokenSilently]);

  useEffect(() => {
    if (!isAuthenticated) return;
    api("/api/me")
      .then((data) => setSettings(data.settings))
      .catch((err) => setError(err.message));
  }, [isAuthenticated, api]);

  async function send(text) {
    const content = (text ?? draft).trim();
    if (!content || busy) return;
    setBusy(true);
    setError("");
    setMessages((m) => [...m, { role: "user", content }]);
    setDraft("");
    try {
      const data = await api("/api/assistant/message", {
        method: "POST",
        body: JSON.stringify({ message: content }),
      });
      setSettings(data.settings);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: data.reply,
          tools: data.tools,
          responder: data.responder,
        },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shell">
      <header>
        <div>
          <h1>Context-Preserving Assistant</h1>
          <p className="sub">
            Auth0 Universal Login · first-party settings API · third-party weather
          </p>
        </div>
        {demoMode ? (
          <span className="badge demo">Demo mode — local mock login (not a live Auth0 session)</span>
        ) : isAuthenticated ? (
          <button className="btn ghost" onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>
            Log out
          </button>
        ) : (
          <button className="btn" onClick={() => loginWithRedirect()}>
            Log in with Auth0
          </button>
        )}
      </header>

      {isLoading && <p>Loading…</p>}

      {!isLoading && !isAuthenticated && !demoMode && (
        <section className="card">
          <h2>Sign in to start</h2>
          <p>
            Universal Login identifies you. The assistant then calls a first-party API with your
            access token for profile settings, and a third-party weather API using the city stored
            there.
          </p>
        </section>
      )}

      {isAuthenticated && (
        <main>
          <aside className="card profile">
            <h2>Signed-in user</h2>
            <dl>
              <dt>Name</dt>
              <dd>{user?.name}</dd>
              <dt>Email</dt>
              <dd>{user?.email}</dd>
              <dt>Subject</dt>
              <dd className="mono">{user?.sub}</dd>
            </dl>
            <h3>First-party settings</h3>
            {settings ? (
              <dl>
                <dt>Preferred name</dt>
                <dd>{settings.preferredName}</dd>
                <dt>Usual city</dt>
                <dd>{settings.homeCity}</dd>
                <dt>Units</dt>
                <dd>{settings.units}</dd>
                <dt>Tone</dt>
                <dd>{settings.briefingTone}</dd>
              </dl>
            ) : (
              <p>Loading settings…</p>
            )}
          </aside>

          <section className="chat card">
            <h2>Conversation</h2>
            <p className="hint">
              The assistant is a <strong>deterministic local responder</strong> (no LLM API key).
              It must read your settings and then call Open-Meteo in the same turn.
            </p>
            <div className="thread" id="thread">
              {messages.length === 0 && (
                <p className="empty">
                  Try the suggested prompt to prove that user context is preserved across both APIs.
                </p>
              )}
              {messages.map((msg, i) => (
                <article key={i} className={`msg ${msg.role}`}>
                  <div className="who">{msg.role === "user" ? "You" : "Assistant"}</div>
                  <p>{msg.content}</p>
                  {msg.tools && msg.tools.length > 0 && (
                    <ul className="tools">
                      {msg.tools.map((tool, j) => (
                        <li key={j}>
                          <span className="tool-name">{tool.name}</span>
                          {tool.output?.city && (
                            <span> → {tool.output.city} {tool.output.temperature}{tool.output.temperatureUnit}</span>
                          )}
                          {tool.output?.homeCity && <span> → {tool.output.homeCity}</span>}
                          {tool.output?.source && <span> → {tool.output.source}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
            {error && <p className="error">{error}</p>}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask about the weather for your usual city…"
                disabled={busy}
              />
              <button className="btn" disabled={busy || !draft.trim()} type="submit">
                {busy ? "Working…" : "Send"}
              </button>
            </form>
          </section>
        </main>
      )}
    </div>
  );
}
