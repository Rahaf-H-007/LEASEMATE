export const API_BASE_URL = "http://localhost:5000/api";

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
  images: Array<{
    url: string;
    status: "pending" | "approved" | "rejected";
  }>;
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
  status: "available" | "booked" | "under maintenance" | "approved" | "pending" | "rejected";
  rejectionReason?: string;
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
        let errorData = {};
        try {
          const responseText = await response.text();
          if (responseText) {
            errorData = JSON.parse(responseText);
          }
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
        }
        
        console.error("API Error Response:", {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });
        
        throw new Error(
          (errorData as any).message ||
            (errorData as any).error ||
            `HTTP error! status: ${response.status} - ${response.statusText}`
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

  async sendBookingRequest(
    unitId: string,
    bookingData: {
      startDate: string;
      endDate: string;
      durationMonths: number;
      price: number;
      message?: string;
    }
  ) {
    const token = localStorage.getItem("leasemate_token");
    if (!token) throw new Error("يجب تسجيل الدخول أولاً");
    const requestData = { unitId, ...bookingData };
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

  async getMyLeases(page = 1, limit = 5) {
    const searchParams = new URLSearchParams();
    if (page) searchParams.append("page", page.toString());
    if (limit) searchParams.append("limit", limit.toString());
    return this.request(
        `/leases/my-leases${
          searchParams.toString() ? `?${searchParams.toString()}` : ""
        }`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("leasemate_token")}`,
          },
        }
      );
  }

  async getLeaseById(leaseId: string) {
    return this.request(`/leases/${leaseId}`, {
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

  // رفض (حذف) طلب الإيجار من قبل المالك
  async rejectBookingRequest(bookingId: string) {
    const token = localStorage.getItem("leasemate_token");
    if (!token) throw new Error("يجب تسجيل الدخول أولاً");

    console.log("Start rejectBookingRequest");
    console.log("Token exists:", !!token);
    console.log("BookingId:", bookingId);

    try {
      const response = await this.request(
        `/booking/request/${bookingId}/reject`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("After deleteOne");
      console.log("After notification");
      console.log("End rejectBookingRequest");
      return response;
    } catch (error) {
      console.error("Notification error:", error);
      // لا ترجع res.status(500) هنا
    }
  }

  // رفض العقد من قبل المستأجر
  async rejectLease(leaseId: string, reason: string) {
    const token = localStorage.getItem("leasemate_token");
    if (!token) throw new Error("يجب تسجيل الدخول أولاً");
    return this.request(`/leases/${leaseId}/reject`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason }),
    });
  }

  async acceptLease(leaseId: string) {
    const token = localStorage.getItem("leasemate_token");
    if (!token) throw new Error("يجب تسجيل الدخول أولاً");
    return this.request(`/leases/${leaseId}/accept`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  }

  async getMyBookingRequestsByUnit(unitId: string) {
    const token = localStorage.getItem("leasemate_token");
    if (!token) throw new Error("يجب تسجيل الدخول أولاً");
    return this.request(`/booking/my-requests/${unitId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // Admin: Get all pending unit images
  async getPendingUnitImages(token: string) {
    return this.request<{ status: string; data: { pendingImages: any[] } }>(
      "/units/admin/pending-images",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  }

  // Admin: Get pending units with full details
  async getPendingUnitsWithDetails(token: string) {
    return this.request<{ status: string; data: { pendingUnits: any[] } }>(
      "/units/admin/pending-units",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  }

  // Admin: Approve or reject a unit image
  async reviewUnitImage({
    unitId,
    imageUrl,
    action,
    token,
  }: {
    unitId: string;
    imageUrl: string;
    action: "approve" | "reject";
    token: string;
  }) {
    return this.request<{ status: string; data: any }>(
      `/units/admin/review-image?action=${action}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ unitId, imageUrl }),
      }
    );
  }

  // Admin: Approve unit
  async approveUnit({ unitId, token }: { unitId: string; token: string }) {
    return this.request<{ status: string; data: any }>(
      "/units/admin/approve-unit",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ unitId }),
      }
    );
  }

  // Admin: Reject unit
  async rejectUnit({
    unitId,
    reason,
    token,
  }: {
    unitId: string;
    reason: string;
    token: string;
  }) {
    return this.request<{ status: string; data: any }>(
      "/units/admin/reject-unit",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ unitId, reason }),
      }
    );
  }

  // Admin: Approve all images for a unit
  async approveAllUnitImages({
    unitId,
    token,
  }: {
    unitId: string;
    token: string;
  }) {
    return this.request<{ status: string; data: any }>(
      "/units/admin/approve-all-images",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ unitId }),
      }
    );
  }

  // Admin: Reject all images for a unit
  async rejectAllUnitImages({
    unitId,
    reason,
    token,
  }: {
    unitId: string;
    reason: string;
    token: string;
  }) {
    return this.request<{ status: string; data: any }>(
      "/units/admin/reject-all-images",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ unitId, reason }),
      }
    );
  }

  // Admin: Get users with more than 3 abusive comments
  async getAbusiveUsers(token: string) {
    return this.request<{ users: any[] }>("/admin/users/abusive", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // Admin: Get available units
  async getAvailableUnits(token: string) {
    return this.request<{ status: string; data: { units: any[] } }>(
      "/units/admin/available-units",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  }

  // Admin: Get maintenance units
  async getMaintenanceUnits(token: string) {
    return this.request<{ status: string; data: { units: any[] } }>(
      "/units/admin/maintenance-units",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  }

  // Admin: Get booked units with lease information
  async getBookedUnits(token: string) {
    return this.request<{ status: string; data: { units: any[] } }>(
      "/units/admin/booked-units",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  }


  // Admin: Get all subscriptions
  async getSubscriptions(token: string) {
    return this.request<{ subscriptions: any[] }>("/admin/subscriptions", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // Admin: Refund subscription
  async refundSubscription(subscriptionId: string, token: string) {
    return this.request<{ message: string; subscription: any }>(`/admin/subscriptions/${subscriptionId}/refund`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });}
  // Check if chat exists between tenant and landlord for a specific unit
  async checkChatExists(tenantId: string, landlordId: string, unitId: string) {
    return this.request<{
      exists: boolean;
      chatId: string | null;
      hasMessages: boolean;
      messageCount: number;
    }>(`/chat/check/${tenantId}/${landlordId}/${unitId}`, {
      method: "GET",
    });
  }

  // إعادة إرسال الوحدة المرفوضة للمراجعة
  async resubmitRejectedUnit(unitId: string, token: string) {
    return this.request<{ status: string; data: any; message: string }>(
      `/units/${unitId}/resubmit`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  }

  async updateUnit(unitId: string, data: FormData | any, token: string): Promise<Unit> {
    const options: RequestInit = {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    if (data instanceof FormData) {
      options.body = data;
    } else {
      options.headers = {
        ...options.headers,
        "Content-Type": "application/json",
      };
      options.body = JSON.stringify(data);
    }

    const response = await this.request<{ status: string; data: { unit: Unit } }>(
      `/units/${unitId}`,
      options
    );
    return response.data.unit;
  }

  // Check if landlord can add a unit
  async canAddUnit(token: string): Promise<{ status: string; canAdd: boolean; reason?: string }> {
    return this.request("/units/can-add", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
}

export const apiService = new ApiService();
