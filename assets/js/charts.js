/**
 * CHARTS.JS
 * Gerencia criação e atualização de todos os gráficos
 */

window.ChartsManager = (function() {
    'use strict';

    // ====================================
    // CHART REGISTRY
    // ====================================

    const chartRegistry = {
        hourly: null,
        daily: null,
        cabine: null,
        programa: null,
        origins: null,
        destinations: null,
        quality: null
    };

    // ====================================
    // CONFIGURAÇÕES PADRÃO
    // ====================================

    const defaultColors = {
        primary: '#667eea',
        secondary: '#764ba2',
        success: '#48bb78',
        info: '#4299e1',
        warning: '#ed8936',
        danger: '#f56565',
        purple: '#9f7aea',
        pink: '#ed64a6',
        teal: '#38b2ac',
        cyan: '#0bc5ea'
    };

    const chartColors = [
        defaultColors.primary,
        defaultColors.secondary,
        defaultColors.success,
        defaultColors.info,
        defaultColors.warning,
        defaultColors.danger,
        defaultColors.purple,
        defaultColors.pink,
        defaultColors.teal,
        defaultColors.cyan
    ];

    const defaultChartOptions = {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            legend: {
                labels: {
                    color: '#e8eaf6',
                    font: {
                        size: 12
                    }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(10, 14, 39, 0.9)',
                titleColor: '#e8eaf6',
                bodyColor: '#9fa8da',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1
            }
        },
        scales: {
            x: {
                ticks: {
                    color: '#9fa8da'
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)'
                }
            },
            y: {
                ticks: {
                    color: '#9fa8da'
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)'
                }
            }
        }
    };

    // ====================================
    // HELPER: DESTROY CHART
    // ====================================

    /**
     * Destrói um gráfico existente antes de criar um novo
     */
    function destroyChart(chartKey) {
        if (chartRegistry[chartKey]) {
            chartRegistry[chartKey].destroy();
            chartRegistry[chartKey] = null;
        }
    }

    /**
     * Destrói todos os gráficos
     */
    function destroyAllCharts() {
        Object.keys(chartRegistry).forEach(key => {
            destroyChart(key);
        });
    }

    // ====================================
    // 1. GRÁFICO DE LINHA: Ofertas por Hora (Últimas 24h)
    // ====================================

    function renderHourlyChart(records) {
        const ctx = document.getElementById('chartHourly');
        if (!ctx) return;

        destroyChart('hourly');

        // Filtrar últimas 24h e agrupar por hora
        const last24h = Utils.filterLast24Hours(records);
        const { labels, data } = Utils.bucketByHour(last24h);

        chartRegistry.hourly = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ofertas Encontradas',
                    data: data,
                    borderColor: defaultColors.primary,
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 5
                }]
            },
            options: {
                ...defaultChartOptions,
                plugins: {
                    ...defaultChartOptions.plugins,
                    title: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        ...defaultChartOptions.scales.x,
                        title: {
                            display: true,
                            text: 'Hora',
                            color: '#9fa8da'
                        }
                    },
                    y: {
                        ...defaultChartOptions.scales.y,
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Quantidade',
                            color: '#9fa8da'
                        },
                        ticks: {
                            ...defaultChartOptions.scales.y.ticks,
                            precision: 0
                        }
                    }
                }
            }
        });
    }

    // ====================================
    // 2. GRÁFICO DE BARRAS: Ofertas por Dia (Últimos 5 Dias)
    // ====================================

    function renderDailyChart(records) {
        const ctx = document.getElementById('chartDaily');
        if (!ctx) return;

        destroyChart('daily');

        const { labels, data } = Utils.bucketByDay(records);

        chartRegistry.daily = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ofertas por Dia',
                    data: data,
                    backgroundColor: defaultColors.success,
                    borderColor: defaultColors.success,
                    borderWidth: 1,
                    borderRadius: 6
                }]
            },
            options: {
                ...defaultChartOptions,
                plugins: {
                    ...defaultChartOptions.plugins,
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        ...defaultChartOptions.scales.x,
                        title: {
                            display: true,
                            text: 'Data',
                            color: '#9fa8da'
                        }
                    },
                    y: {
                        ...defaultChartOptions.scales.y,
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Quantidade',
                            color: '#9fa8da'
                        },
                        ticks: {
                            ...defaultChartOptions.scales.y.ticks,
                            precision: 0
                        }
                    }
                }
            }
        });
    }

    // ====================================
    // 3. GRÁFICO PIZZA: Distribuição por Tipo de Cabine
    // ====================================

    function renderCabineChart(records) {
        const ctx = document.getElementById('chartCabine');
        if (!ctx) return;

        destroyChart('cabine');

        const counts = Utils.groupCount(records, 'cabine');
        const labels = Object.keys(counts);
        const data = Object.values(counts);

        // Se não houver dados
        if (labels.length === 0) {
            renderEmptyPieChart('cabine', ctx);
            return;
        }

        chartRegistry.cabine = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: chartColors,
                    borderColor: '#0a0e27',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#e8eaf6',
                            padding: 15,
                            font: {
                                size: 11
                            }
                        }
                    },
                    tooltip: {
                        ...defaultChartOptions.plugins.tooltip,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // ====================================
    // 4. GRÁFICO PIZZA: Distribuição por Programa de Emissão
    // ====================================

    function renderProgramaChart(records) {
        const ctx = document.getElementById('chartPrograma');
        if (!ctx) return;

        destroyChart('programa');

        const counts = Utils.groupCount(records, 'programa');
        const labels = Object.keys(counts);
        const data = Object.values(counts);

        // Se não houver dados
        if (labels.length === 0) {
            renderEmptyPieChart('programa', ctx);
            return;
        }

        chartRegistry.programa = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: chartColors,
                    borderColor: '#0a0e27',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#e8eaf6',
                            padding: 15,
                            font: {
                                size: 11
                            }
                        }
                    },
                    tooltip: {
                        ...defaultChartOptions.plugins.tooltip,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // ====================================
    // 5. GRÁFICO DE BARRAS: Top 5 Origens
    // ====================================

    function renderOriginsChart(records) {
        const ctx = document.getElementById('chartOrigins');
        if (!ctx) return;

        destroyChart('origins');

        const counts = Utils.groupCount(records, 'origem');
        const { labels, data } = Utils.topN(counts, 5);

        // Se não houver dados
        if (labels.length === 0) {
            renderEmptyBarChart('origins', ctx, 'Nenhuma origem encontrada');
            return;
        }

        chartRegistry.origins = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Quantidade',
                    data: data,
                    backgroundColor: defaultColors.info,
                    borderColor: defaultColors.info,
                    borderWidth: 1,
                    borderRadius: 6
                }]
            },
            options: {
                ...defaultChartOptions,
                indexAxis: 'y',
                plugins: {
                    ...defaultChartOptions.plugins,
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        ...defaultChartOptions.scales.x,
                        beginAtZero: true,
                        ticks: {
                            ...defaultChartOptions.scales.x.ticks,
                            precision: 0
                        }
                    },
                    y: {
                        ...defaultChartOptions.scales.y,
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // ====================================
    // 6. GRÁFICO DE BARRAS: Top 5 Destinos
    // ====================================

    function renderDestinationsChart(records) {
        const ctx = document.getElementById('chartDestinations');
        if (!ctx) return;

        destroyChart('destinations');

        const counts = Utils.groupCount(records, 'destino');
        const { labels, data } = Utils.topN(counts, 5);

        // Se não houver dados
        if (labels.length === 0) {
            renderEmptyBarChart('destinations', ctx, 'Nenhum destino encontrado');
            return;
        }

        chartRegistry.destinations = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Quantidade',
                    data: data,
                    backgroundColor: defaultColors.warning,
                    borderColor: defaultColors.warning,
                    borderWidth: 1,
                    borderRadius: 6
                }]
            },
            options: {
                ...defaultChartOptions,
                indexAxis: 'y',
                plugins: {
                    ...defaultChartOptions.plugins,
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        ...defaultChartOptions.scales.x,
                        beginAtZero: true,
                        ticks: {
                            ...defaultChartOptions.scales.x.ticks,
                            precision: 0
                        }
                    },
                    y: {
                        ...defaultChartOptions.scales.y,
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // ====================================
    // 7. GRÁFICO DE BARRAS: Qualidade dos Dados
    // ====================================

    function renderQualityChart(records) {
        const ctx = document.getElementById('chartQuality');
        if (!ctx) return;

        destroyChart('quality');

        const { labels, percentages } = Utils.calculateDataQuality(records);

        chartRegistry.quality = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Percentual (%)',
                    data: percentages,
                    backgroundColor: [
                        defaultColors.danger,
                        defaultColors.warning,
                        defaultColors.info,
                        defaultColors.purple
                    ],
                    borderRadius: 6
                }]
            },
            options: {
                ...defaultChartOptions,
                plugins: {
                    ...defaultChartOptions.plugins,
                    legend: {
                        display: false
                    },
                    tooltip: {
                        ...defaultChartOptions.plugins.tooltip,
                        callbacks: {
                            label: function(context) {
                                return `${context.parsed.y}% dos registros`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ...defaultChartOptions.scales.x
                    },
                    y: {
                        ...defaultChartOptions.scales.y,
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Percentual (%)',
                            color: '#9fa8da'
                        }
                    }
                }
            }
        });
    }

    // ====================================
    // EMPTY STATES
    // ====================================

    function renderEmptyPieChart(key, ctx) {
        chartRegistry[key] = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Sem dados'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['rgba(255, 255, 255, 0.1)'],
                    borderColor: '#0a0e27',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: false
                    }
                }
            }
        });
    }

    function renderEmptyBarChart(key, ctx, message) {
        chartRegistry[key] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [message],
                datasets: [{
                    data: [0],
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#9fa8da' },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' }
                    },
                    y: {
                        beginAtZero: true,
                        max: 10,
                        ticks: { color: '#9fa8da' },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' }
                    }
                }
            }
        });
    }

    // ====================================
    // RENDER ALL CHARTS
    // ====================================

    /**
     * Renderiza todos os gráficos com os dados fornecidos
     * @param {Array} records - Registros filtrados
     * @param {Array} rawRecords - Registros originais (para qualidade)
     */
    function renderAllCharts(records, rawRecords) {
        console.log('[Charts] Renderizando todos os gráficos...');

        try {
            renderHourlyChart(records);
            renderDailyChart(records);
            renderCabineChart(records);
            renderProgramaChart(records);
            renderOriginsChart(records);
            renderDestinationsChart(records);
            renderQualityChart(rawRecords); // Usa dados brutos para qualidade

            console.log('[Charts] Todos os gráficos renderizados com sucesso');
        } catch (error) {
            console.error('[Charts] Erro ao renderizar gráficos:', error);
            Utils.showAlert('Erro ao renderizar gráficos. Verifique o console.', 'danger');
        }
    }

    // ====================================
    // PUBLIC API
    // ====================================

    return {
        renderAllCharts,
        renderHourlyChart,
        renderDailyChart,
        renderCabineChart,
        renderProgramaChart,
        renderOriginsChart,
        renderDestinationsChart,
        renderQualityChart,
        destroyAllCharts
    };

})();
