/**
 * SUPABASE.JS
 * Gerencia conexão, fetch e realtime com Supabase
 */

// Namespace global
window.SupabaseManager = (function() {
    'use strict';

    // ====================================
    // STATE
    // ====================================

    let client = null;
    let realtimeChannel = null;
    let isConnected = false;

    // Configurações
    const SUPABASE_URL = 'https://pmnzatqwdpfucduwzjef.supabase.co'; // URL do projeto (fixo)
    const TABLE_NAME = 'Rotas Encontradas'; // Nome da tabela (com espaço)
    const STORAGE_KEY = 'supabase_anon_key';

    // ====================================
    // INITIALIZATION
    // ====================================

    /**
     * Inicializa o cliente Supabase com a anon key
     * @param {string} anonKey - Anon key pública
     * @returns {boolean} Sucesso ou falha
     */
    function initialize(anonKey) {
        try {
            if (!anonKey) {
                throw new Error('Anon key não fornecida');
            }

            // Criar cliente Supabase
            client = supabase.createClient(SUPABASE_URL, anonKey);

            if (!client) {
                throw new Error('Falha ao criar cliente Supabase');
            }

            isConnected = true;
            console.log('[Supabase] Cliente inicializado com sucesso');
            return true;

        } catch (error) {
            console.error('[Supabase] Erro ao inicializar:', error);
            isConnected = false;
            client = null;
            throw error;
        }
    }

    /**
     * Testa conexão fazendo uma query simples
     * @returns {Promise<boolean>}
     */
    async function testConnection() {
        try {
            if (!client) {
                throw new Error('Cliente não inicializado');
            }

            Utils.updateConnectionBadge('connecting', 'Testando conexão...');

            // Tenta buscar 1 registro apenas para testar
            const { data, error } = await client
                .from(TABLE_NAME)
                .select('*')
                .limit(1);

            if (error) {
                throw error;
            }

            console.log('[Supabase] Conexão testada com sucesso');
            Utils.updateConnectionBadge('connected', 'Conectado');
            return true;

        } catch (error) {
            console.error('[Supabase] Erro ao testar conexão:', error);

            // Tratamento de erro 401 (policy RLS ou key inválida)
            if (error.code === '401' || error.message.includes('401')) {
                Utils.showAlert(
                    'Anon key inválida ou política RLS bloqueando SELECT. Verifique suas configurações no Supabase.',
                    'danger',
                    0
                );
            } else {
                Utils.showAlert(
                    `Erro ao conectar: ${error.message}`,
                    'danger',
                    0
                );
            }

            Utils.updateConnectionBadge('error', 'Erro na conexão');
            isConnected = false;
            return false;
        }
    }

    // ====================================
    // DATA FETCHING
    // ====================================

    /**
     * Busca todos os registros da tabela (com paginação opcional)
     * @param {number} limit - Limite de registros (0 = todos)
     * @returns {Promise<Array>}
     */
    async function fetchAllRecords(limit = 0) {
        try {
            if (!client) {
                throw new Error('Cliente não inicializado. Configure a anon key primeiro.');
            }

            console.log('[Supabase] Buscando registros...');

            let query = client
                .from(TABLE_NAME)
                .select('*')
                .order('created_at', { ascending: false });

            // Aplicar limite se especificado
            if (limit > 0) {
                query = query.limit(limit);
            }

            const { data, error } = await query;

            if (error) {
                throw error;
            }

            console.log(`[Supabase] ${data.length} registros obtidos com sucesso`);
            return data || [];

        } catch (error) {
            console.error('[Supabase] Erro ao buscar registros:', error);

            // Tratamento de erro 401
            if (error.code === '401' || error.message.includes('401')) {
                Utils.showAlert(
                    'Erro 401: Anon key inválida ou política RLS bloqueando SELECT.',
                    'danger'
                );
            } else {
                Utils.showAlert(
                    `Erro ao buscar dados: ${error.message}`,
                    'danger'
                );
            }

            throw error;
        }
    }

    /**
     * Busca com paginação (para datasets muito grandes)
     * @param {number} page - Número da página (começa em 0)
     * @param {number} pageSize - Tamanho da página
     * @returns {Promise<Object>} { data, hasMore }
     */
    async function fetchPaginated(page = 0, pageSize = 1000) {
        try {
            if (!client) {
                throw new Error('Cliente não inicializado');
            }

            const from = page * pageSize;
            const to = from + pageSize - 1;

            const { data, error, count } = await client
                .from(TABLE_NAME)
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) {
                throw error;
            }

            return {
                data: data || [],
                hasMore: (from + data.length) < count,
                total: count
            };

        } catch (error) {
            console.error('[Supabase] Erro na paginação:', error);
            throw error;
        }
    }

    // ====================================
    // REALTIME SUBSCRIPTION
    // ====================================

    /**
     * Inscreve-se em mudanças em tempo real na tabela
     * @param {Function} onInsert - Callback quando novo registro é inserido
     * @param {Function} onUpdate - Callback quando registro é atualizado
     * @param {Function} onDelete - Callback quando registro é deletado
     */
    function subscribeToChanges(onInsert, onUpdate, onDelete) {
        try {
            if (!client) {
                console.warn('[Supabase] Cliente não inicializado, pulando realtime');
                return;
            }

            // Unsubscribe anterior se existir
            if (realtimeChannel) {
                unsubscribeFromChanges();
            }

            console.log('[Supabase] Inscrevendo em mudanças em tempo real...');

            // Criar canal realtime
            realtimeChannel = client
                .channel('rotas-changes')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: TABLE_NAME
                    },
                    (payload) => {
                        console.log('[Supabase Realtime] INSERT:', payload);
                        if (onInsert) onInsert(payload.new);
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: TABLE_NAME
                    },
                    (payload) => {
                        console.log('[Supabase Realtime] UPDATE:', payload);
                        if (onUpdate) onUpdate(payload.new, payload.old);
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'DELETE',
                        schema: 'public',
                        table: TABLE_NAME
                    },
                    (payload) => {
                        console.log('[Supabase Realtime] DELETE:', payload);
                        if (onDelete) onDelete(payload.old);
                    }
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('[Supabase Realtime] Inscrito com sucesso');
                        Utils.showAlert('Realtime ativado! Dados atualizarão automaticamente.', 'success', 3000);
                    } else if (status === 'CHANNEL_ERROR') {
                        console.error('[Supabase Realtime] Erro no canal');
                        Utils.showAlert('Erro no Realtime. Usando polling como fallback.', 'warning', 3000);
                    } else if (status === 'TIMED_OUT') {
                        console.warn('[Supabase Realtime] Timeout');
                    }
                });

        } catch (error) {
            console.error('[Supabase] Erro ao inscrever em realtime:', error);
            Utils.showAlert('Realtime não disponível. Usando atualização manual.', 'warning', 3000);
        }
    }

    /**
     * Cancela inscrição de mudanças em tempo real
     */
    function unsubscribeFromChanges() {
        if (realtimeChannel) {
            console.log('[Supabase] Cancelando inscrição realtime...');
            client.removeChannel(realtimeChannel);
            realtimeChannel = null;
        }
    }

    // ====================================
    // KEY MANAGEMENT
    // ====================================

    /**
     * Salva anon key no localStorage
     */
    function saveKey(anonKey) {
        try {
            localStorage.setItem(STORAGE_KEY, anonKey);
            console.log('[Supabase] Anon key salva no localStorage');
        } catch (error) {
            console.error('[Supabase] Erro ao salvar key:', error);
            throw new Error('Não foi possível salvar a chave no navegador');
        }
    }

    /**
     * Carrega anon key do localStorage
     */
    function loadKey() {
        try {
            const key = localStorage.getItem(STORAGE_KEY);
            return key || null;
        } catch (error) {
            console.error('[Supabase] Erro ao carregar key:', error);
            return null;
        }
    }

    /**
     * Remove anon key do localStorage
     */
    function clearKey() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            console.log('[Supabase] Anon key removida do localStorage');
        } catch (error) {
            console.error('[Supabase] Erro ao remover key:', error);
        }
    }

    // ====================================
    // GETTERS
    // ====================================

    function getClient() {
        return client;
    }

    function getIsConnected() {
        return isConnected;
    }

    function getTableName() {
        return TABLE_NAME;
    }

    // ====================================
    // PUBLIC API
    // ====================================

    return {
        initialize,
        testConnection,
        fetchAllRecords,
        fetchPaginated,
        subscribeToChanges,
        unsubscribeFromChanges,
        saveKey,
        loadKey,
        clearKey,
        getClient,
        getIsConnected,
        getTableName
    };

})();
