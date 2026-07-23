import { Navigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const ProtAuth = ({ children }) => {
  const userLocal = sessionStorage.getItem('user');

  if (userLocal) {
    toast.warn('You are already logged in');
    return <Navigate to="/" />;
  }

  return children;
};

export default ProtAuth;
