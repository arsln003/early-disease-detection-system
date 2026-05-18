import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';

// State ka structure
interface AuthState {
  user: any | null;
  token: string | null;
  role: 'admin' | 'doctor' | 'radiologist' | null;
  isAuthenticated: boolean;
}

// App load hotay hi Cookie se token check karo
const token = Cookies.get('authToken');
let initialUser = null;
let initialRole = null;

if (token) {
  try {
    const decoded: any = jwtDecode(token);
    initialUser = decoded;
    // Backend se role token k andar aata hai, agar nahi toh alag cookie se le lo
    initialRole = decoded.role || Cookies.get('userRole'); 
  } catch (error) {
    Cookies.remove('authToken');
  }
}

const initialState: AuthState = {
  user: initialUser,
  token: token || null,
  role: initialRole,
  isAuthenticated: !!token,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Login hone par yeh function call hoga
    setAuth: (state, action: PayloadAction<{ token: string; user: any; role: any }>) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.role = action.payload.role;
      state.isAuthenticated = true;
      
      // Cookies mein save kar do taake secure rahay
      // Cookies.set('authToken', action.payload.token, { expires: 1 }); // 1 din ki expiry
      // Cookies.set('userRole', action.payload.role, { expires: 1 });

      Cookies.set('authToken', action.payload.token, { expires: 1, path: '/' });
Cookies.set('userRole', action.payload.role, { expires: 1, path: '/' });
    },
    // Logout hone par yeh call hoga
    // logout: (state) => {
    //   state.user = null;
    //   state.token = null;
    //   state.role = null;
    //   state.isAuthenticated = false;
      
    //   Cookies.remove('authToken');
    //   Cookies.remove('userRole');
    //   localStorage.removeItem('accessToken'); // Purana wala bhi saaf kar do
    // Logout hone par yeh call hoga
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.role = null;
      state.isAuthenticated = false;
      
      // FIX: Path '/' batana lazmi hai warna cookie delete nahi hogi!
      Cookies.remove('authToken', { path: '/' });
      Cookies.remove('userRole', { path: '/' });
      localStorage.removeItem('accessToken'); 
    },
  },
});

export const { setAuth, logout } = authSlice.actions;
export default authSlice.reducer;