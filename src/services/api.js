import axios from 'axios';
import { RFID_MOCK_DATA } from './mockData';

const API_BASE_URL = 'https://rfid-sentinel-api.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const getStudents = async () => {
  try {
    const response = await api.get('/students');
    return response.data;
  } catch (error) {
    console.warn('Backend not available, using mock data');
    return RFID_MOCK_DATA;
  }
};

export const logAttendance = async (data) => {
  try {
    const response = await api.post('/attendance', data);
    return response.data;
  } catch (error) {
    console.warn('Backend not available, attendance not logged to Sheets');
    return { success: true, mock: true };
  }
};

export const addStudent = async (studentData) => {
  try {
    const response = await api.post('/students', studentData);
    return response.data;
  } catch (error) {
    console.error('Failed to add student to backend');
    throw error;
  }
};

export const getAnalytics = async () => {
  try {
    const response = await api.get('/analytics');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch analytics');
    return { sectionStats: {}, studentStats: {}, totalLogs: 0 };
  }
};

export const getTeachers = async () => {
  try {
    const response = await api.get('/teachers');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch teachers');
    return [];
  }
};

export const addTeacher = async (teacherData) => {
  try {
    const response = await api.post('/teachers', teacherData);
    return response.data;
  } catch (error) {
    console.error('Failed to add teacher');
    throw error;
  }
};
