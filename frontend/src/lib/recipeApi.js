import api from './api';

export const recipeApi = {
    getAll: () => api.get('/recipes'),
    getOne: (id) => api.get(`/recipes/${id}`),
    create: (data) => api.post('/recipes', data),
    update: (id, data) => api.put(`/recipes/${id}`, data),
    delete: (id) => api.delete(`/recipes/${id}`),
    getSteps: (recipeId) => api.get(`/recipes/${recipeId}/steps`),
    saveSteps: (recipeId, steps) => api.put(`/recipes/${recipeId}/steps`, { steps }),
    run: (recipeId) => api.post(`/recipes/${recipeId}/run`),
    getRuns: (recipeId) => api.get(`/recipes/${recipeId}/runs`),
};
