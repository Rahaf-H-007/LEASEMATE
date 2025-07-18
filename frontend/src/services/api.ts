const API_BASE_URL = "http://localhost:5000/api";

export interface RegisterData {
  name: string;
  username?: string;
  phone?: string;
  password: string;
  role: "landlord" | "tenant";
}

export interface LoginData {
  usernameOrPhone: string;
  password: string;
}

export interface AuthResponse {
  _id: string;
  name: string;
  role: "landlord" | "tenant" | "admin";
  token: string;
  verificationStatus?: {
    status: "pending" | "approved" | "rejected";
    idVerified?: boolean;
    faceMatched?: boolean;
    uploadedIdUrl?: string;
    selfieUrl?: string;
    idData?: {
      name?: string;
      idNumber?: string;
      birthDate?: string;
    };
  };
}

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      credentials: "include",
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      return response.json();
    } catch (error) {
      if (
        error instanceof TypeError &&
        error.message.includes("Failed to fetch")
      ) {
        throw new Error(
          "Network error: Unable to connect to the server. Please check if the backend server is running."
        );
      }
      throw error;
    }
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    return this.request<AuthResponse>("/users/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginData): Promise<AuthResponse> {
    return this.request<AuthResponse>("/users/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getProfile(token: string) {
    return this.request("/users/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async uploadVerification(formData: FormData, token: string) {
    const url = `${API_BASE_URL}/users/me/verify-id`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      return response.json();
    } catch (error) {
      if (
        error instanceof TypeError &&
        error.message.includes("Failed to fetch")
      ) {
        throw new Error(
          "Network error: Unable to connect to the server. Please check if the backend server is running."
        );
      }
      throw error;
    }
  }

  async getUsers(token: string) {
    return this.request("/admin/users", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async updateVerificationStatus(
    userId: string,
    action: "approve" | "reject",
    token: string
  ) {
    return this.request(`/admin/users/${userId}/verification`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action }),
    });
  }
}

export const apiService = new ApiService();
