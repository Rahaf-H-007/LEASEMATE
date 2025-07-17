const API_BASE_URL = "http://localhost:5000/api";

export interface RegisterData {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  role: "landlord" | "tenant";
}

export interface LoginData {
  emailOrPhone: string;
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

export interface Unit {
  _id: string;
  name: string;
  description: string;
  pricePerMonth: number;
  address: string;
  city: string;
  governorate: string;
  postalCode?: number;
  numRooms: number;
  space: number;
  type: "villa" | "apartment";
  images: string[];
  ownerId: string;
  isFurnished: boolean;
  hasPool: boolean;
  hasAC: boolean;
  hasTV: boolean;
  hasWifi: boolean;
  hasKitchenware: boolean;
  hasHeating: boolean;
  status: "available" | "booked" | "under maintenance";
  createdAt?: string;
  updatedAt?: string;
}

export interface UnitsResponse {
  status: string;
  data: {
    units: Unit[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalUnits: number;
      limit: number;
    };
  };
}

export interface UnitResponse {
  status: string;
  data: {
    unit: Unit;
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

  async getUnits(
    token?: string,
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      minPrice?: number;
      maxPrice?: number;
      type?: string;
      lat?: number;
      lng?: number;
      radius?: number;
    }
  ): Promise<UnitsResponse> {
    const searchParams = new URLSearchParams();

    if (params) {
      if (params.page) searchParams.append("page", params.page.toString());
      if (params.limit) searchParams.append("limit", params.limit.toString());
      if (params.search && params.search.trim()) searchParams.append("search", params.search);
      if (params.minPrice)
        searchParams.append("minPrice", params.minPrice.toString());
      if (params.maxPrice)
        searchParams.append("maxPrice", params.maxPrice.toString());
      if (params.type) searchParams.append("type", params.type);
      if (params.lat) searchParams.append("lat", params.lat.toString());
      if (params.lng) searchParams.append("lng", params.lng.toString());
      if (params.radius)
        searchParams.append("radius", params.radius.toString());
    }

    const endpoint = `/units${
      searchParams.toString() ? `?${searchParams.toString()}` : ""
    }`;

    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await this.request<UnitsResponse>(endpoint, {
      headers,
    });

    return response;
  }

  async getUnitById(unitId: string, token?: string): Promise<Unit> {
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await this.request<UnitResponse>(`/units/${unitId}`, {
      headers,
    });

    return response.data.unit;
  }

  async createUnit(unitData: FormData, token: string): Promise<Unit> {
    const url = `${API_BASE_URL}/units`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: unitData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const result = await response.json();
      return result.data.unit;
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
}

export const apiService = new ApiService();
