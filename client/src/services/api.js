const API_URL = 'http://localhost:4000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const getUsers = async () => {
  const response = await fetch(`${API_URL}/users`, { headers: getAuthHeaders() });
  return response.json();
};

export const getProjects = async () => {
  const response = await fetch(`${API_URL}/projects`, { headers: getAuthHeaders() });
  return response.json();
};

export const getAllEmployeeTasks = async () => {
  const response = await fetch(`${API_URL}/all-employee-tasks`, { headers: getAuthHeaders() });
  return response.json();
};

export const createProject = async (projectData) => {
  const response = await fetch(`${API_URL}/projects`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(projectData)
  });
  return response.json();
};

export const updateProject = async (projectId, projectData) => {
  const response = await fetch(`${API_URL}/projects/${projectId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(projectData)
  });
  return response.json();
};

export const deleteProject = async (projectId) => {
  const response = await fetch(`${API_URL}/projects/${projectId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return response.json();
};

export const addTask = async (projectId, taskData) => {
  const response = await fetch(`${API_URL}/projects/${projectId}/tasks`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(taskData)
  });
  return response.json();
};

export const updateTask = async (projectId, taskId, taskData) => {
  const response = await fetch(`${API_URL}/projects/${projectId}/tasks/${taskId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(taskData)
  });
  return response.json();
};

export const deleteTask = async (projectId, taskId) => {
  const response = await fetch(`${API_URL}/projects/${projectId}/tasks/${taskId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return response.json();
};

export const addMessage = async (projectId, taskId, messageData) => {
  const response = await fetch(`${API_URL}/projects/${projectId}/tasks/${taskId}/messages`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(messageData)
  });
  return response.json();
};

export const addFiles = async (projectId, taskId, fileData) => {
  const response = await fetch(`${API_URL}/projects/${projectId}/tasks/${taskId}/files`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(fileData)
  });
  return response.json();
};