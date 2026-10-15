// api.js
// Comunicação com o backend do projeto IoT.
// Se o celular não conseguir acessar o backend, troque API_BASE_URL pelo IP
// da máquina que está executando o Laravel e verifique se ambos estão na mesma rede.

const API_BASE_URL = 'http://10.137.11.6/api/sensor/status';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message =
      data?.message || data?.erro || data?.error || `Erro HTTP ${response.status}`;
    throw new Error(message);
  }

  return data;
}

function unwrapList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.sensores)) return data.sensores;
  if (Array.isArray(data?.sensors)) return data.sensors;
  if (Array.isArray(data?.resultado)) return data.resultado;
  return [];
}

function unwrapSensor(data) {
  return data?.data || data?.sensor || data?.resultado || data;
}

export async function listarSensores() {
  const data = await request('/listar');
  return unwrapList(data);
}

export async function visualizarSensor(codigo) {
  const data = await request(`/visualizar/${encodeURIComponent(codigo)}`);
  return unwrapSensor(data);
}

export async function atualizarStatus(codigo, status) {
  // Ajuste este payload caso seu backend espere "id" em vez de "codigo".
  // Esta rota usa PUT, conforme a requisição validada no Insomnia.
  const payload = {
    codigo,
    status: Boolean(status),
  };

  console.log('[API] Atualizando status:', {
    url: `${API_BASE_URL}/atualizar`,
    method: 'PUT',
    payload,
  });

  const response = await request('/atualizar', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  console.log('[API] Status atualizado:', response);
  return response;
}

export default {
  listarSensores,
  visualizarSensor,
  atualizarStatus,
};
