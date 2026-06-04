const BASE_URL = 'http://localhost:8000'

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    return response.json()
  }

  return response.text()
}

async function requestJson(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...options.headers,
    },
  })

  const payload = await parseResponse(response)

  if (!response.ok) {
    const message =
      (payload && typeof payload === 'object' && (payload.detail || payload.message)) ||
      (typeof payload === 'string' && payload) ||
      'Request failed'

    throw new Error(message)
  }

  return payload
}

function withApiKey(apiKey) {
  return apiKey ? { 'X-API-Key': apiKey } : {}
}

export async function fetchLogs(clientId, apiKey) {
  return requestJson(`/api/logs/${clientId}`, {
    method: 'GET',
    headers: {
      ...withApiKey(apiKey),
    },
  })
}

export async function fetchStats(clientId, apiKey) {
  return requestJson(`/api/stats/${clientId}`, {
    method: 'GET',
    headers: {
      ...withApiKey(apiKey),
    },
  })
}

export async function sendQuery(query, apiKey, history = []) {
  return requestJson('/api/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...withApiKey(apiKey),
    },
    body: JSON.stringify({
      query,
      conversation_history: history,
    }),
  })
}

export async function uploadFile(file, apiKey) {
  const formData = new FormData()
  formData.append('file', file)

  return requestJson('/api/upload', {
    method: 'POST',
    headers: {
      ...withApiKey(apiKey),
    },
    body: formData,
  })
}
