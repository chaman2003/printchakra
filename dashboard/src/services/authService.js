import apiService from './apiService';

class AuthService {
  async login(username, password) {
    try {
      const response = await apiService.login(username, password);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async register(username, password, deviceId = 'dashboard') {
    try {
      const response = await apiService.register(username, password, deviceId);
      return response;
    } catch (error) {
      throw error;
    }
  }

  logout() {
    apiService.logout();
  }

  isAuthenticated() {
    return apiService.isAuthenticated();
  }

  getCurrentUser() {
    return apiService.getCurrentUser();
  }

  getAuthToken() {
    return localStorage.getItem('authToken');
  }
}

export default new AuthService();
