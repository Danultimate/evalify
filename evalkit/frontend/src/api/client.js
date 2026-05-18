import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export default api

export const suites = {
  list: () => api.get('/suites').then(r => r.data),
  get: (id) => api.get(`/suites/${id}`).then(r => r.data),
  create: (data) => api.post('/suites', data).then(r => r.data),
  delete: (id) => api.delete(`/suites/${id}`).then(r => r.data),
  runs: (id) => api.get(`/suites/${id}/runs`).then(r => r.data),
  addCase: (suiteId, data) => api.post(`/suites/${suiteId}/cases`, data).then(r => r.data),
}

export const cases = {
  update: (id, data) => api.put(`/suites/cases/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/suites/cases/${id}`).then(r => r.data),
}

export const runs = {
  list: () => api.get('/runs').then(r => r.data),
  create: (data) => api.post('/runs', data).then(r => r.data),
  get: (id) => api.get(`/runs/${id}`).then(r => r.data),
  results: (id) => api.get(`/runs/${id}/results`).then(r => r.data),
}

export const results = {
  compare: (runIds) =>
    api.get('/compare', { params: { run_ids: runIds } }).then(r => r.data),
}

export const models = {
  list: () => api.get('/models').then(r => r.data),
}

export const config = {
  get: () => api.get('/config').then(r => r.data),
}
