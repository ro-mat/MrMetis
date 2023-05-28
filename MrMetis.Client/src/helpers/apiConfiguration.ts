import axios, { AxiosError } from "axios";

const headers: any = {
  "Content-Type": "application/json",
};

export const axiosConf = {
  baseURL: `${process.env.REACT_APP_API_ROOT}`,
  headers: headers,
};

const axiosInstance = axios.create(axiosConf);

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const typedError = error as AxiosError;
    if (typedError.config.url === "identity/me") {
      return Promise.reject(error.message);
    }

    if (typedError.response?.status === 401) {
      // Unauthorized
      localStorage.removeItem("token");
      window.location.href = "/login";
    } else {
    }

    return Promise.reject(error.response);
  }
);

export default axiosInstance;
