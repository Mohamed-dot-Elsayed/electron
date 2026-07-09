import { useState, useEffect } from 'react';

export default function App() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/auth/get', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add authorization header if needed
          // 'Authorization': `Bearer ${yourToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setUsers(data.data.users);
      } else {
        throw new Error('Failed to fetch users');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 900, margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Local + Remote Sync Demo</h1>
        <button 
          onClick={fetchUsers}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Refresh Users
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Loading users...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{ 
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Users List */}
      {!loading && !error && (
        <div>
          <div style={{ marginBottom: '1rem', color: '#666' }}>
            Total Users: <strong>{users.length}</strong>
          </div>

          <div style={{ 
            display: 'grid', 
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))'
          }}>
            {users.map((user) => (
              <div 
                key={user._id}
                style={{
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  padding: '1rem',
                  backgroundColor: '#f9f9f9',
                  transition: 'box-shadow 0.2s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: user.image_url ? 'transparent' : '#007bff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '1.2rem',
                    overflow: 'hidden',
                  }}>
                    {user.image_url ? (
                      <img 
                        src={user.image_url} 
                        alt={user.username} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      user.username.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <strong style={{ fontSize: '1.1rem' }}>{user.username}</strong>
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>
                      {user.role && <span>Role: <span style={{ fontWeight: '500' }}>{user.role}</span></span>}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.9rem', color: '#555', marginTop: '0.5rem' }}>
                  <div style={{ marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: '500' }}>Email:</span> {user.email}
                  </div>
                  {user.phone && (
                    <div style={{ marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: '500' }}>Phone:</span> {user.phone}
                    </div>
                  )}
                  {user.company_name && (
                    <div style={{ marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: '500' }}>Company:</span> {user.company_name}
                    </div>
                  )}
                  <div style={{ marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: '500' }}>Status:</span>{' '}
                    <span style={{
                      color: user.status === 'active' ? '#28a745' : '#dc3545',
                      fontWeight: '500',
                    }}>
                      {user.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '0.25rem' }}>
                    Created: {formatDate(user.createdAt)}
                  </div>
                  {user.permissions && user.permissions.length > 0 && (
                    <div style={{ marginTop: '0.25rem' }}>
                      <span style={{ fontWeight: '500' }}>Permissions:</span>{' '}
                      <span style={{ fontSize: '0.85rem' }}>
                        {user.permissions.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* No Users Message */}
          {users.length === 0 && (
            <div style={{ 
              textAlign: 'center', 
              padding: '3rem', 
              color: '#666',
              backgroundColor: '#f5f5f5',
              borderRadius: '8px',
            }}>
              <p>No users found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}