import { useAuthStore } from '../store/authStore';
import { useNavigation } from '@react-navigation/native';

export const useAuth = () => {
    const { user, isAuthenticated, isLoading, login, register, logout, checkAuth } = useAuthStore();
    const navigation = useNavigation();

    // Note: checkAuth is NOT called here automatically.
    // It should only be called once at app startup (in AppNavigator).
    // Calling it on every screen mount would cause unnecessary re-auth attempts.

    const handleLogin = async (email: string, password: string) => {
        try {
            await login({ email, password });
            return { success: true };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    };

    const handleRegister = async (email: string, password: string, name: string, inviteCode: string) => {
        try {
            await register({ email, password, name, inviteCode });
            return { success: true };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigation.reset({
                index: 0,
                routes: [{ name: 'Auth' as never }],
            });
            return { success: true };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    };

    return {
        user,
        isAuthenticated,
        isLoading,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
    };
};