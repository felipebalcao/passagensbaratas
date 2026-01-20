/**
 * UTILS.JS
 * Funções auxiliares para o dashboard
 */

// ====================================
// FIELD PICKING (variações de nomes)
// ====================================

/**
 * Tenta encontrar um valor em um objeto usando variações de nome de campo
 * @param {Object} obj - Objeto a buscar
 * @param {Array<string>} variations - Array de variações do nome do campo
 * @returns {*} Valor encontrado ou null
 */
function pickField(obj, variations) {
    if (!obj) return null;
    for (const variant of variations) {
        if (obj.hasOwnProperty(variant)) {
            return obj[variant];
        }
    }
    return null;
}

/**
 * Extrai campos de um registro com tratamento de variações
 */
function extractFields(record) {
    return {
        origem: pickField(record, ['ORigem', 'Origem', 'origem']),
        destino: pickField(record, ['Destino', 'destino']),
        programa: pickField(record, ['programa_emissao', 'Programa_Emissao', 'programa', 'emissao']),
        cabine: pickField(record, ['tipo_cabine', 'Tipo_Cabine', 'cabine', 'Cabine']),
        data_viagem: pickField(record, ['Data_Viagem', 'data_viagem', 'DataViagem', 'dataViagem']),
        pontos: pickField(record, ['pontos', 'Pontos']),
        taxa: pickField(record, ['taxa', 'Taxa']),
        link: pickField(record, ['link_acesso', 'Link_Acesso', 'link', 'Link']),
        created_at: pickField(record, ['created_at', 'Created_At', 'createdAt', 'CreatedAt'])
    };
}

// ====================================
// VALIDAÇÃO E LIMPEZA
// ====================================

/**
 * Verifica se um valor é vazio (null, undefined, string vazia)
 */
function isEmpty(value) {
    return value === null || value === undefined || value === '';
}

/**
 * Filtra registros vazios baseado nas opções
 * @param {Array} records - Array de registros
 * @param {boolean} ignoreEmpty - Se deve remover registros vazios
 * @returns {Array} Registros filtrados
 */
function filterEmptyRecords(records, ignoreEmpty) {
    if (!ignoreEmpty) return records;

    return records.filter(record => {
        const fields = extractFields(record);
        // Remove se origem, destino, programa ou created_at estiverem vazios
        return !isEmpty(fields.origem) &&
               !isEmpty(fields.destino) &&
               !isEmpty(fields.programa) &&
               !isEmpty(fields.created_at);
    });
}

/**
 * Aplica filtros de data aos registros
 * @param {Array} records - Array de registros
 * @param {string|null} startDate - Data início (ISO string ou null)
 * @param {string|null} endDate - Data fim (ISO string ou null)
 * @returns {Array} Registros filtrados
 */
function filterByDateRange(records, startDate, endDate) {
    return records.filter(record => {
        const fields = extractFields(record);
        const createdAt = fields.created_at;

        if (!createdAt) return false; // Remove se não tiver created_at

        const recordDate = new Date(createdAt);
        if (isNaN(recordDate.getTime())) return false; // Data inválida

        // Filtro de início
        if (startDate) {
            const start = new Date(startDate);
            if (recordDate < start) return false;
        }

        // Filtro de fim
        if (endDate) {
            const end = new Date(endDate);
            if (recordDate > end) return false;
        }

        return true;
    });
}

// ====================================
// DATE BUCKETING & GROUPING
// ====================================

/**
 * Agrupa registros por hora (últimas 24 horas)
 * @param {Array} records - Registros a agrupar
 * @returns {Object} { labels: [...], data: [...] }
 */
function bucketByHour(records) {
    const now = new Date();
    const hourBuckets = {};

    // Inicializar todas as 24 horas com 0
    for (let i = 23; i >= 0; i--) {
        const date = new Date(now);
        date.setHours(now.getHours() - i, 0, 0, 0);
        const hour = date.getHours();
        const label = `${hour.toString().padStart(2, '0')}:00`;
        hourBuckets[label] = { count: 0, timestamp: date.getTime() };
    }

    // Contar registros por hora
    records.forEach(record => {
        const fields = extractFields(record);
        if (!fields.created_at) return;

        const date = new Date(fields.created_at);
        if (isNaN(date.getTime())) return;

        // Apenas últimas 24h
        const diff = now - date;
        const hours24 = 24 * 60 * 60 * 1000;
        if (diff > hours24 || diff < 0) return;

        const hour = date.getHours();
        const label = `${hour.toString().padStart(2, '0')}:00`;

        if (hourBuckets[label]) {
            hourBuckets[label].count++;
        }
    });

    // Ordenar por timestamp e extrair labels e data
    const sorted = Object.entries(hourBuckets)
        .sort((a, b) => a[1].timestamp - b[1].timestamp);

    return {
        labels: sorted.map(([label]) => label),
        data: sorted.map(([, value]) => value.count)
    };
}

/**
 * Agrupa registros por dia (últimos 5 dias incluindo hoje)
 * @param {Array} records - Registros a agrupar
 * @returns {Object} { labels: [...], data: [...] }
 */
function bucketByDay(records) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayBuckets = {};

    // Inicializar últimos 5 dias com 0
    for (let i = 4; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const label = formatDateBR(date);
        dayBuckets[label] = { count: 0, timestamp: date.getTime() };
    }

    // Contar registros por dia
    records.forEach(record => {
        const fields = extractFields(record);
        if (!fields.created_at) return;

        const date = new Date(fields.created_at);
        if (isNaN(date.getTime())) return;

        // Zerar horas para comparar apenas dia
        date.setHours(0, 0, 0, 0);
        const label = formatDateBR(date);

        if (dayBuckets[label]) {
            dayBuckets[label].count++;
        }
    });

    // Ordenar por timestamp
    const sorted = Object.entries(dayBuckets)
        .sort((a, b) => a[1].timestamp - b[1].timestamp);

    return {
        labels: sorted.map(([label]) => label),
        data: sorted.map(([, value]) => value.count)
    };
}

/**
 * Filtra registros das últimas 24 horas
 */
function filterLast24Hours(records) {
    const now = new Date();
    const hours24Ago = new Date(now.getTime() - (24 * 60 * 60 * 1000));

    return records.filter(record => {
        const fields = extractFields(record);
        if (!fields.created_at) return false;

        const date = new Date(fields.created_at);
        if (isNaN(date.getTime())) return false;

        return date >= hours24Ago && date <= now;
    });
}

// ====================================
// AGGREGATION HELPERS
// ====================================

/**
 * Conta ocorrências de valores em um campo
 * @param {Array} records - Registros
 * @param {string} fieldName - Nome do campo (origem, destino, programa, cabine)
 * @returns {Object} { label: count, ... }
 */
function groupCount(records, fieldName) {
    const counts = {};

    records.forEach(record => {
        const fields = extractFields(record);
        const value = fields[fieldName];

        if (isEmpty(value)) return;

        const key = String(value).trim();
        counts[key] = (counts[key] || 0) + 1;
    });

    return counts;
}

/**
 * Retorna os top N itens de um objeto de contagens
 * @param {Object} counts - Objeto { label: count }
 * @param {number} n - Número de itens a retornar
 * @returns {Object} { labels: [...], data: [...] }
 */
function topN(counts, n = 5) {
    const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n);

    return {
        labels: sorted.map(([label]) => label),
        data: sorted.map(([, count]) => count)
    };
}

/**
 * Calcula estatísticas de qualidade de dados
 * @param {Array} records - Registros originais (sem filtros)
 * @returns {Object} { labels: [...], percentages: [...] }
 */
function calculateDataQuality(records) {
    if (records.length === 0) {
        return {
            labels: ['Origem vazia', 'Destino vazio', 'Programa vazio', 'Link vazio'],
            percentages: [0, 0, 0, 0]
        };
    }

    let origemEmpty = 0;
    let destinoEmpty = 0;
    let programaEmpty = 0;
    let linkEmpty = 0;

    records.forEach(record => {
        const fields = extractFields(record);
        if (isEmpty(fields.origem)) origemEmpty++;
        if (isEmpty(fields.destino)) destinoEmpty++;
        if (isEmpty(fields.programa)) programaEmpty++;
        if (isEmpty(fields.link)) linkEmpty++;
    });

    const total = records.length;

    return {
        labels: ['Origem vazia', 'Destino vazio', 'Programa vazio', 'Link vazio'],
        percentages: [
            ((origemEmpty / total) * 100).toFixed(1),
            ((destinoEmpty / total) * 100).toFixed(1),
            ((programaEmpty / total) * 100).toFixed(1),
            ((linkEmpty / total) * 100).toFixed(1)
        ]
    };
}

// ====================================
// FORMATAÇÃO
// ====================================

/**
 * Formata data em pt-BR (dd/mm/aaaa)
 */
function formatDateBR(date) {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }
    if (isNaN(date.getTime())) return '';

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
}

/**
 * Formata data e hora em pt-BR
 */
function formatDateTimeBR(date) {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }
    if (isNaN(date.getTime())) return '';

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Formata número com separador de milhares
 */
function formatNumber(num) {
    if (num === null || num === undefined) return '-';
    return Number(num).toLocaleString('pt-BR');
}

/**
 * Formata valor monetário em BRL
 */
function formatCurrency(value) {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// ====================================
// UI HELPERS
// ====================================

/**
 * Mostra um alerta no topo da página
 * @param {string} message - Mensagem a exibir
 * @param {string} type - Tipo: success, danger, warning, info
 * @param {number} duration - Duração em ms (0 = permanente)
 */
function showAlert(message, type = 'info', duration = 5000) {
    const container = document.getElementById('alertContainer');
    if (!container) return;

    const alertId = 'alert-' + Date.now();
    const alertHTML = `
        <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
            <strong>${type === 'danger' ? 'Erro:' : type === 'success' ? 'Sucesso:' : 'Aviso:'}</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', alertHTML);

    if (duration > 0) {
        setTimeout(() => {
            const alert = document.getElementById(alertId);
            if (alert) {
                const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
                bsAlert.close();
            }
        }, duration);
    }
}

/**
 * Remove skeleton loaders de um elemento
 */
function removeSkeleton(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const skeleton = element.querySelector('.skeleton-text');
    if (skeleton) {
        skeleton.remove();
    }
}

/**
 * Atualiza badge de status de conexão
 */
function updateConnectionBadge(status, message) {
    const badge = document.getElementById('connectionBadge');
    if (!badge) return;

    // Remove classes existentes
    badge.classList.remove('bg-secondary', 'bg-success', 'bg-warning', 'bg-danger');

    let icon = 'circle-fill';
    let colorClass = 'bg-secondary';

    switch (status) {
        case 'waiting':
            colorClass = 'bg-secondary';
            icon = 'circle-fill';
            break;
        case 'connecting':
            colorClass = 'bg-warning';
            icon = 'arrow-repeat';
            break;
        case 'connected':
            colorClass = 'bg-success';
            icon = 'check-circle-fill';
            break;
        case 'error':
            colorClass = 'bg-danger';
            icon = 'x-circle-fill';
            break;
    }

    badge.classList.add(colorClass);
    badge.innerHTML = `<i class="bi bi-${icon} ${status === 'connecting' ? 'pulse-dot' : ''}"></i> ${message}`;
}

// ====================================
// EXPORT
// ====================================

// Funções disponíveis globalmente
window.Utils = {
    pickField,
    extractFields,
    isEmpty,
    filterEmptyRecords,
    filterByDateRange,
    bucketByHour,
    bucketByDay,
    filterLast24Hours,
    groupCount,
    topN,
    calculateDataQuality,
    formatDateBR,
    formatDateTimeBR,
    formatNumber,
    formatCurrency,
    showAlert,
    removeSkeleton,
    updateConnectionBadge
};
