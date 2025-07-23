const API_BASE_URL = "http://localhost:5000/api";

export interface RegisterData {
  name: string;
  email?: string;
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

export interface Unit {
  _id: string;
  name: string;
  description: string;
  pricePerMonth: number;
  securityDeposit?: number;
  address: string;
  city: string;
  governorate: string;
  postalCode?: number;
  numRooms: number;
  space: number;
  type: "villa" | "apartment";
  images: string[];
  ownerId:
    | string
    | {
        _id: string;
        name: string;
        email?: string;
        phone?: string;
        verificationStatus?: {
          status: "pending" | "approved" | "rejected";
          idVerified?: boolean;
          faceMatched?: boolean;
        };
      };
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
      totalAvailableUnits: number;
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

    console.log("Request config:", {
      url,
      method: config.method,
      body: config.body,
      headers: config.headers,
    });

    try {
      const response = await fetch(url, config);

      console.log("Response status:", response.status);
      console.log(
        "Response headers:",
        Object.fromEntries(response.headers.entries())
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("API Error Response:", {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });
        throw new Error(
          errorData.message ||
            errorData.error ||
            `HTTP error! status: ${response.status}`
        );
      }

      const result = await response.json();
      console.log("API Success Response:", result);
      return result;
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

  async getReviewsForUser(userId: string) {
    return this.request(`/reviews/${userId}`);
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
      governorate?: string;
      isFurnished?: boolean;
      hasAC?: boolean;
      hasWifi?: boolean;
      hasTV?: boolean;
      hasKitchenware?: boolean;
      hasHeating?: boolean;
      hasPool?: boolean;
    }
  ): Promise<UnitsResponse> {
    const searchParams = new URLSearchParams();

    if (params) {
      if (params.page) searchParams.append("page", params.page.toString());
      if (params.limit) searchParams.append("limit", params.limit.toString());
      if (params.search && params.search.trim())
        searchParams.append("search", params.search);
      if (params.minPrice)
        searchParams.append("minPrice", params.minPrice.toString());
      if (params.maxPrice)
        searchParams.append("maxPrice", params.maxPrice.toString());
      if (params.type) searchParams.append("type", params.type);
      if (params.lat) searchParams.append("lat", params.lat.toString());
      if (params.lng) searchParams.append("lng", params.lng.toString());
      if (params.radius)
        searchParams.append("radius", params.radius.toString());
      if (params.governorate)
        searchParams.append("governorate", params.governorate);

      // Amenity filters
      if (params.isFurnished !== undefined) {
        searchParams.append("isFurnished", params.isFurnished.toString());
      }
      if (params.hasAC) searchParams.append("hasAC", "true");
      if (params.hasWifi) searchParams.append("hasWifi", "true");
      if (params.hasTV) searchParams.append("hasTV", "true");
      if (params.hasKitchenware) searchParams.append("hasKitchenware", "true");
      if (params.hasHeating) searchParams.append("hasHeating", "true");
      if (params.hasPool) searchParams.append("hasPool", "true");
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

  async getMyUnits(
    token: string
  ): Promise<{ status: string; data: { units: Unit[] } }> {
    return this.request("/units/my-units", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async sendBookingRequest(unitId: string, message: string = "") {
    const token = localStorage.getItem("leasemate_token");
    if (!token) throw new Error("يجب تسجيل الدخول أولاً");

    const requestData = { unitId, message };

    console.log("=== FRONTEND BOOKING REQUEST DEBUG ===");
    console.log("Token exists:", !!token);
    console.log("Request data:", requestData);
    console.log("JSON stringified:", JSON.stringify(requestData));
    console.log("=====================================");

    return this.request("/booking/request", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    });
  }

  async getLandlordBookingRequests() {
    const token = localStorage.getItem("leasemate_token");
    if (!token) throw new Error("يجب تسجيل الدخول أولاً");

    console.log("=== GET LANDLORD BOOKING REQUESTS DEBUG ===");
    console.log("Token exists:", !!token);
    console.log("Token preview:", token.substring(0, 20) + "...");
    console.log("===========================================");

    return this.request("/booking/landlord-requests", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async createLeaseForBooking(
    bookingId: string,
    leaseData: {
      rentAmount: number;
      depositAmount: number;
      startDate: string;
      endDate: string;
      paymentTerms: string;
    }
  ) {
    const token = localStorage.getItem("leasemate_token");
    if (!token) throw new Error("يجب تسجيل الدخول أولاً");

    console.log("=== CREATE LEASE FOR BOOKING DEBUG ===");
    console.log("BookingId:", bookingId);
    console.log("Lease data:", leaseData);
    console.log("=====================================");

    return this.request(`/leases/create/${bookingId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(leaseData),
    });
  }

  async getMyLeases() {
    return this.request("/leases/my-leases", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("leasemate_token")}`,
      },
    });
  }

  async downloadLeasePDF(leaseId: string) {
    const url = `${API_BASE_URL}/leases/${leaseId}/pdf`;
    const token = localStorage.getItem("leasemate_token");

    console.log("Downloading PDF for lease:", leaseId);
    console.log("Token exists:", !!token);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      console.log("Response status:", response.status);
      console.log("Content-Type:", response.headers.get("content-type"));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("PDF download error response:", errorData);
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      // التحقق من نوع المحتوى
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/pdf")) {
        console.error("Invalid content type:", contentType);
        throw new Error("الملف المستلم ليس PDF صالح");
      }

      // Get the PDF blob
      const blob = await response.blob();
      console.log("PDF blob size:", blob.size, "bytes");

      if (blob.size === 0) {
        throw new Error("الملف فارغ");
      }

      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `lease_${leaseId}.pdf`;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      console.log("PDF downloaded successfully");
      return { success: true };
    } catch (error) {
      console.error("PDF download error:", error);
      throw error;
    }
  }
  async getUserById(userId: string) {
    return this.request(`/users/${userId}`);
  }

  async getUnitsByLandlord(landlordId: string) {
    return this.request(`/units?ownerId=${landlordId}`);
  }
}

export const apiService = new ApiService();
