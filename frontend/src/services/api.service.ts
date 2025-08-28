import axios, { AxiosError } from "axios";
import { getSessionToken } from "@descope/react-sdk";

const AGENT_A_URL = import.meta.env.VITE_AGENT_A_URL || "http://localhost:3001";
const AGENT_B_URL = import.meta.env.VITE_AGENT_B_URL || "http://localhost:3002";

// Create axios instances
const agentAClient = axios.create({
  baseURL: AGENT_A_URL,
  timeout: 30000,
});

const agentBClient = axios.create({
  baseURL: AGENT_B_URL,
  timeout: 30000,
});

// Request interceptors to add auth token
[agentAClient, agentBClient].forEach((client) => {
  client.interceptors.request.use(
    (config) => {
      const token = getSessionToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        // Handle unauthorized - maybe redirect to login
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }
  );
});

// API functions
export const processEmails = async (params: { maxResults: number }) => {
  const response = await agentAClient.post("/api/process-emails", params);
  return response.data;
};

export const extractTasks = async (email: any) => {
  const response = await agentAClient.post("/api/extract-tasks", { email });
  return response.data;
};

export const createEvents = async (events: any[]) => {
  const response = await agentBClient.post("/api/create-events", { events });
  return response.data;
};

export const listEvents = async () => {
  const response = await agentBClient.get("/api/events");
  return response.data;
};

// Health check functions
export const checkAgentAHealth = async () => {
  const response = await agentAClient.get("/api/health");
  return response.data;
};

export const checkAgentBHealth = async () => {
  const response = await agentBClient.get("/api/health");
  return response.data;
};
