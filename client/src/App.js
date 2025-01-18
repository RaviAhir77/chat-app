import './App.css';
import Login from './page/Login';
import Chat from './page/Chat';
import {Routes,Route,Navigate,useLocation} from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('jwt_token');
  const isLoggedIn = Boolean(token);
  const location = useLocation();

  if (!isLoggedIn && location.pathname !== '/user/signup' && location.pathname !== '/user/login') {
    return <Navigate to="/user/login" />;
  }

  if (isLoggedIn && ['/user/signup', '/user/login'].includes(location.pathname)) {
    return <Navigate to="/" />;
  }

  return children;
};

function App() {
  return (
    <Routes>
      <Route path='/' element={
        <ProtectedRoute>
          <Chat/>
        </ProtectedRoute>
        }/>
      <Route path='/user/signup' element={
        <ProtectedRoute>
          <Login isSignup={true}/>
        </ProtectedRoute>
        }/>
      <Route path='/user/login' element={
        <ProtectedRoute>
          <Login isSignup={false}/>
        </ProtectedRoute>
        }/>
    </Routes>
  );
}

export default App;
