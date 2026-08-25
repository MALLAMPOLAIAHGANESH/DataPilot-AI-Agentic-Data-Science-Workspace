import axios from 'axios';

const API_URL = 'http://localhost:8000';

export const uploadData = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post(`${API_URL}/upload`, formData);
    return response.data;
};

export const chatWithData = async (query: string) => {
    const response = await axios.post(`${API_URL}/chat`, { query });
    return response.data;
};

export const generateDlModel = async (targetColumn: string, taskType: string) => {
    const response = await axios.post(`${API_URL}/generate-dl`, {
        target_column: targetColumn,
        task_type: taskType
    });
    return response.data;
};