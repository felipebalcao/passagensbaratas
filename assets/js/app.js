/**
 * APP.JS
 * Orquestrador principal do dashboard
 */

(function() {
    'use strict';

    // ====================================
    // STATE
    // ====================================

    let rawRecords = []; // Dados originais (sem filtros)
    let filteredRecords = []; // Dados após aplicar filtros
    let autoRefreshInterval = null;
    let isInitialized = false;

    // Filtros atuais
    let currentFilters = {
        dateStart: null,
        dateEnd: null,
        ignoreEmpty: false
    };

    // ====================================
    // DOM ELEMENTS
    // ====================================

    const elements = {
        // Key management
        inputAnonKey: null,
        btnToggleKey: null,
        btnSaveKey: null,
        btnClearKey: null,
        btnTestConnection: null,

        // Filters
        filterDateStart: null,
        filterDateEnd: null,
        filterIgnoreEmpty: null,
        btnApplyFilters: null,

        // Actions
        btnRefresh: null,

        // KPIs
        kpiTotal: null,
        kpiLastUpdate: null,
        kpi24h: null,
        kpiPeak: null,

        // Table
        latestOffersTableBody: null
    };

    // ====================================
    // INITIALIZATION
    // ====================================

    /**
     * Inicializa a aplicação
     */
    function init() {
        console.log('[App] Inicializando dashboard...');

        // Mapear elementos DOM
        mapDOMElements();

        // Configurar event listeners
        setupEventListeners();

        // Tentar carregar key salva
        attemptAutoConnect();

        console.log('[App] Dashboard inicializado');
        isInitialized = true;
    }

    /**
     * Mapeia todos os elementos DOM
     */
    function mapDOMElements() {
        elements.inputAnonKey = document.getElementById('inputAnonKey');
        elements.btnToggleKey = document.getElementById('btnToggleKey');
        elements.btnSaveKey = document.getElementById('btnSaveKey');
        elements.btnClearKey = document.getElementById('btnClearKey');
        elements.btnTestConnection = document.getElementById('btnTestConnection');

        elements.filterDateStart = document.getElementById('filterDateStart');
        elements.filterDateEnd = document.getElementById('filterDateEnd');
        elements.filterIgnoreEmpty = document.getElementById('filterIgnoreEmpty');
        elements.btnApplyFilters = document.getElementById('btnApplyFilters');

        elements.btnRefresh = document.getElementById('btnRefresh');

        elements.kpiTotal = document.getElementById('kpiTotal');
        elements.kpiLastUpdate = document.getElementById('kpiLastUpdate');
        elements.kpi24h = document.getElementById('kpi24h');
        elements.kpiPeak = document.getElementById('kpiPeak');

        elements.latestOffersTableBody = document.getElementById('latestOffersTableBody');
    }

    /**
     * Configura event listeners
     */
    function setupEventListeners() {
        // Toggle visualização da key
        elements.btnToggleKey.addEventListener('click', toggleKeyVisibility);

        // Salvar key
        elements.btnSaveKey.addEventListener('click', handleSaveKey);

        // Limpar key
        elements.btnClearKey.addEventListener('click', handleClearKey);

        // Testar conexão
        elements.btnTestConnection.addEventListener('click', handleTestConnection);

        // Aplicar filtros
        elements.btnApplyFilters.addEventListener('click', handleApplyFilters);

        // Refresh manual
        elements.btnRefresh.addEventListener('click', handleRefresh);
    }

    /**
     * Tenta conectar automaticamente se houver key salva
     */
    async function attemptAutoConnect() {
        const savedKey = SupabaseManager.loadKey();

        if (savedKey) {
            console.log('[App] Anon key encontrada no localStorage, tentando conectar...');
            elements.inputAnonKey.value = savedKey;

            try {
                Utils.updateConnectionBadge('connecting', 'Conectando...');

                SupabaseManager.initialize(savedKey);
                const success = await SupabaseManager.testConnection();

                if (success) {
                    onConnectionSuccess();
                } else {
                    onConnectionError();
                }
            } catch (error) {
                console.error('[App] Erro na conexão automática:', error);
                onConnectionError();
            }
        } else {
            console.log('[App] Nenhuma anon key salva encontrada');
            Utils.updateConnectionBadge('waiting', 'Aguardando chave');
        }
    }

    // ====================================
    // EVENT HANDLERS - KEY MANAGEMENT
    // ====================================

    function toggleKeyVisibility() {
        const input = elements.inputAnonKey;
        const icon = elements.btnToggleKey.querySelector('i');

        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.replace('bi-eye', 'bi-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.replace('bi-eye-slash', 'bi-eye');
        }
    }

    async function handleSaveKey() {
        const key = elements.inputAnonKey.value.trim();

        if (!key) {
            Utils.showAlert('Por favor, cole sua anon key antes de salvar.', 'warning');
            return;
        }

        try {
            Utils.updateConnectionBadge('connecting', 'Conectando...');

            // Salvar no localStorage
            SupabaseManager.saveKey(key);

            // Inicializar cliente
            SupabaseManager.initialize(key);

            // Testar conexão
            const success = await SupabaseManager.testConnection();

            if (success) {
                Utils.showAlert('Anon key salva e conexão estabelecida!', 'success', 3000);
                onConnectionSuccess();
            } else {
                onConnectionError();
            }

        } catch (error) {
            console.error('[App] Erro ao salvar key:', error);
            Utils.showAlert(`Erro ao salvar: ${error.message}`, 'danger');
            onConnectionError();
        }
    }

    function handleClearKey() {
        if (!confirm('Tem certeza que deseja remover a anon key salva?')) {
            return;
        }

        SupabaseManager.clearKey();
        elements.inputAnonKey.value = '';

        // Parar auto-refresh
        stopAutoRefresh();

        // Resetar UI
        Utils.updateConnectionBadge('waiting', 'Aguardando chave');
        elements.btnRefresh.disabled = true;

        Utils.showAlert('Anon key removida. Configure novamente para usar o dashboard.', 'info', 3000);

        // Limpar dados
        rawRecords = [];
        filteredRecords = [];
        renderDashboard();
    }

    async function handleTestConnection() {
        const key = elements.inputAnonKey.value.trim();

        if (!key) {
            Utils.showAlert('Por favor, cole sua anon key antes de testar.', 'warning');
            return;
        }

        try {
            Utils.updateConnectionBadge('connecting', 'Testando...');

            SupabaseManager.initialize(key);
            const success = await SupabaseManager.testConnection();

            if (success) {
                Utils.showAlert('Conexão testada com sucesso!', 'success', 3000);
            }

        } catch (error) {
            console.error('[App] Erro ao testar conexão:', error);
        }
    }

    // ====================================
    // CONNECTION CALLBACKS
    // ====================================

    function onConnectionSuccess() {
        console.log('[App] Conexão estabelecida com sucesso');

        // Habilitar botões
        elements.btnRefresh.disabled = false;

        // Buscar dados iniciais
        fetchData();

        // Iniciar auto-refresh
        startAutoRefresh();

        // Inscrever em realtime
        subscribeToRealtime();
    }

    function onConnectionError() {
        console.error('[App] Erro na conexão');
        elements.btnRefresh.disabled = true;
        stopAutoRefresh();
    }

    // ====================================
    // DATA FETCHING
    // ====================================

    async function fetchData() {
        try {
            console.log('[App] Buscando dados do Supabase...');

            const data = await SupabaseManager.fetchAllRecords();

            rawRecords = data;
            applyFilters();
            renderDashboard();

            console.log(`[App] ${rawRecords.length} registros carregados`);

        } catch (error) {
            console.error('[App] Erro ao buscar dados:', error);
            Utils.showAlert('Erro ao carregar dados. Verifique a conexão.', 'danger');
        }
    }

    // ====================================
    // FILTERS
    // ====================================

    function handleApplyFilters() {
        currentFilters.dateStart = elements.filterDateStart.value || null;
        currentFilters.dateEnd = elements.filterDateEnd.value || null;
        currentFilters.ignoreEmpty = elements.filterIgnoreEmpty.checked;

        console.log('[App] Aplicando filtros:', currentFilters);

        applyFilters();
        renderDashboard();

        Utils.showAlert('Filtros aplicados com sucesso!', 'success', 2000);
    }

    function applyFilters() {
        let records = [...rawRecords];

        // Filtro de data
        if (currentFilters.dateStart || currentFilters.dateEnd) {
            records = Utils.filterByDateRange(
                records,
                currentFilters.dateStart,
                currentFilters.dateEnd
            );
        }

        // Filtro de vazios
        if (currentFilters.ignoreEmpty) {
            records = Utils.filterEmptyRecords(records, true);
        }

        filteredRecords = records;
        console.log(`[App] Filtros aplicados: ${filteredRecords.length} de ${rawRecords.length} registros`);
    }

    // ====================================
    // REFRESH
    // ====================================

    async function handleRefresh() {
        console.log('[App] Refresh manual disparado');
        await fetchData();
        Utils.showAlert('Dados atualizados!', 'success', 2000);
    }

    function startAutoRefresh() {
        // Parar qualquer intervalo anterior
        stopAutoRefresh();

        console.log('[App] Iniciando auto-refresh (60s)');

        autoRefreshInterval = setInterval(async () => {
            console.log('[App] Auto-refresh disparado');
            await fetchData();
        }, 60000); // 60 segundos
    }

    function stopAutoRefresh() {
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
            console.log('[App] Auto-refresh parado');
        }
    }

    // ====================================
    // REALTIME
    // ====================================

    function subscribeToRealtime() {
        SupabaseManager.subscribeToChanges(
            onRealtimeInsert,
            onRealtimeUpdate,
            onRealtimeDelete
        );
    }

    function onRealtimeInsert(newRecord) {
        console.log('[App Realtime] Novo registro inserido', newRecord);
        rawRecords.unshift(newRecord); // Adiciona no início
        applyFilters();
        renderDashboard();
        Utils.showAlert('Nova oferta adicionada em tempo real!', 'info', 3000);
    }

    function onRealtimeUpdate(newRecord, oldRecord) {
        console.log('[App Realtime] Registro atualizado', { newRecord, oldRecord });
        // Encontrar e atualizar
        const index = rawRecords.findIndex(r => r.id === newRecord.id);
        if (index !== -1) {
            rawRecords[index] = newRecord;
            applyFilters();
            renderDashboard();
        }
    }

    function onRealtimeDelete(deletedRecord) {
        console.log('[App Realtime] Registro deletado', deletedRecord);
        rawRecords = rawRecords.filter(r => r.id !== deletedRecord.id);
        applyFilters();
        renderDashboard();
    }

    // ====================================
    // RENDER DASHBOARD
    // ====================================

    function renderDashboard() {
        renderKPIs();
        renderCharts();
        renderLatestOffersTable();
    }

    function renderKPIs() {
        const total = filteredRecords.length;
        const last24h = Utils.filterLast24Hours(filteredRecords);
        const count24h = last24h.length;

        // Calcular pico por hora nas últimas 24h
        const { data: hourlyData } = Utils.bucketByHour(last24h);
        const peak = hourlyData.length > 0 ? Math.max(...hourlyData) : 0;

        // Total
        elements.kpiTotal.innerHTML = Utils.formatNumber(total);
        Utils.removeSkeleton('kpiTotal');

        // Última atualização
        const now = new Date();
        elements.kpiLastUpdate.innerHTML = Utils.formatDateTimeBR(now);
        Utils.removeSkeleton('kpiLastUpdate');

        // Últimas 24h
        elements.kpi24h.innerHTML = Utils.formatNumber(count24h);
        Utils.removeSkeleton('kpi24h');

        // Pico
        elements.kpiPeak.innerHTML = Utils.formatNumber(peak);
        Utils.removeSkeleton('kpiPeak');
    }

    function renderCharts() {
        ChartsManager.renderAllCharts(filteredRecords, rawRecords);
    }

    function renderLatestOffersTable() {
        const tbody = elements.latestOffersTableBody;
        if (!tbody) return;

        // Pegar últimos 10 registros (ordenados por created_at desc)
        const latest = [...filteredRecords]
            .sort((a, b) => {
                const dateA = new Date(Utils.extractFields(a).created_at || 0);
                const dateB = new Date(Utils.extractFields(b).created_at || 0);
                return dateB - dateA;
            })
            .slice(0, 10);

        if (latest.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted">Nenhuma oferta encontrada</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = latest.map(record => {
            const fields = Utils.extractFields(record);

            return `
                <tr>
                    <td>${fields.created_at ? Utils.formatDateTimeBR(new Date(fields.created_at)) : '-'}</td>
                    <td>${fields.origem || '-'}</td>
                    <td>${fields.destino || '-'}</td>
                    <td>${fields.programa || '-'}</td>
                    <td>${fields.cabine || '-'}</td>
                    <td>${Utils.formatNumber(fields.pontos)}</td>
                    <td>${Utils.formatCurrency(fields.taxa)}</td>
                    <td>
                        ${fields.link
                            ? `<a href="${fields.link}" target="_blank" class="text-primary">
                                <i class="bi bi-box-arrow-up-right"></i> Abrir
                               </a>`
                            : '-'}
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ====================================
    // BOOT
    // ====================================

    // Inicializar quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Cleanup ao sair
    window.addEventListener('beforeunload', () => {
        stopAutoRefresh();
        SupabaseManager.unsubscribeFromChanges();
    });

})();
