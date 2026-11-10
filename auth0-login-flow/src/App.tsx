import { useAuth0 } from '@auth0/auth0-react'
import LoginButton from './LoginButton.tsx'
import LogoutButton from './LogoutButton.tsx'
import Profile from './Profile.tsx'
import './App.css'

function App() {
  const { isLoading, error } = useAuth0()

  if (error) {
    return (
      <main>
        <h1>Auth0 Login Flow</h1>
        <p className="error">Authentication error: {error.message}</p>
      </main>
    )
  }

  if (isLoading) {
    return (
      <main>
        <h1>Auth0 Login Flow</h1>
        <p>Loading…</p>
      </main>
    )
  }

  return (
    <main>
      <h1>Auth0 Login Flow</h1>
      <p>MLH Global Hack Week: Builders Week — Auth0 React SPA login.</p>
      <div className="actions">
        <LoginButton />
        <LogoutButton />
      </div>
      <Profile />
    </main>
  )
}

export default App
