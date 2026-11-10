import { useAuth0 } from '@auth0/auth0-react'

function Profile() {
  const { user, isAuthenticated, isLoading } = useAuth0()

  if (isLoading) {
    return <p>Loading profile…</p>
  }

  if (!isAuthenticated || !user) {
    return <p>Log in to see your profile.</p>
  }

  return (
    <div className="profile">
      {user.picture && (
        <img src={user.picture} alt={user.name ?? 'User avatar'} />
      )}
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  )
}

export default Profile
