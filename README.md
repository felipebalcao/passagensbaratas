# Dashboard de Rotas Encontradas 🎯

Dashboard estático em tempo real para monitorar ofertas de passagens em milhas encontradas pelo robô, conectado ao Supabase.

## 🚀 Características

- **100% Estático**: HTML, CSS e JavaScript puro - sem build, sem npm
- **Tempo Real**: Atualização via Supabase Realtime + polling automático (60s)
- **Responsivo**: Layout adaptável para desktop e mobile
- **Tema Dark Premium**: Glassmorphism com gradientes suaves
- **6 Gráficos Principais**:
  - Ofertas por hora (últimas 24h) - linha
  - Ofertas por dia (últimos 5 dias) - barras
  - Distribuição por tipo de cabine - pizza
  - Distribuição por programa de emissão - pizza
  - Top 5 origens - barras horizontais
  - Top 5 destinos - barras horizontais
- **Qualidade de Dados**: Gráfico mostrando percentual de campos vazios
- **Filtros Avançados**: Por data (created_at) e opção de remover registros vazios
- **Segurança**: Usa apenas Supabase Anon Key (pública), armazenada no navegador

## 📁 Estrutura do Projeto

```
/
├── index.html                      # Página principal
├── assets/
│   ├── css/
│   │   └── styles.css             # Tema dark glassmorphism
│   ├── js/
│   │   ├── app.js                 # Orquestrador principal
│   │   ├── charts.js              # Gerenciamento de gráficos
│   │   ├── supabase.js            # Cliente Supabase e realtime
│   │   └── utils.js               # Funções auxiliares
│   └── img/                       # Imagens (opcional)
└── README.md                      # Este arquivo
```

## 🔧 Configuração

### 1. Pré-requisitos

- Projeto Supabase configurado
- Tabela "Rotas Encontradas" criada
- Anon Key (chave pública) do Supabase

### 2. Estrutura da Tabela Supabase

A tabela **"Rotas Encontradas"** deve ter as seguintes colunas:

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `ORigem` ou `origem` | text | Cidade de origem |
| `Destino` ou `destino` | text | Cidade de destino |
| `Data_Viagem` | date | Data da viagem |
| `programa_emissao` | text | Programa de milhas |
| `tipo_cabine` | text | Classe da viagem |
| `pontos` | numeric | Quantidade de pontos |
| `taxa` | numeric | Taxa em moeda local |
| `link_acesso` | text | Link para a oferta |
| `created_at` | timestamp | Data de criação do registro |

**Nota**: O dashboard lida com variações de maiúsculas/minúsculas nos nomes das colunas.

### 3. Configurar RLS (Row Level Security)

Para que o dashboard funcione, você precisa permitir SELECT na tabela usando a anon key:

```sql
-- Habilitar RLS na tabela
ALTER TABLE "Rotas Encontradas" ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir SELECT público
CREATE POLICY "Permitir leitura pública"
ON "Rotas Encontradas"
FOR SELECT
USING (true);
```

### 4. Obter a Anon Key

1. Acesse seu projeto no [Supabase Dashboard](https://app.supabase.com)
2. Vá em **Settings** → **API**
3. Copie a **anon public** key

### 5. Hospedagem

Como é 100% estático, você pode hospedar em qualquer serviço:

- **GitHub Pages**
- **Netlify**
- **Vercel**
- **AWS S3 + CloudFront**
- **Firebase Hosting**
- Qualquer servidor web (Apache, Nginx)

Basta fazer upload dos arquivos e acessar via navegador!

## 🎮 Como Usar

### Primeira Vez

1. Abra o `index.html` no navegador
2. Cole sua **Supabase Anon Key** no campo indicado
3. Clique em **Salvar** (a chave será armazenada no localStorage do navegador)
4. O dashboard conectará automaticamente e carregará os dados

### Filtros

- **Data Início/Fim**: Filtra registros por `created_at`
- **Desconsiderar vazios**: Remove registros com campos obrigatórios vazios (origem, destino, programa, created_at)
- Clique em **Aplicar Filtros** para atualizar

### Atualização

- **Manual**: Botão "Atualizar agora"
- **Automática**: A cada 60 segundos
- **Tempo Real**: Via Supabase Realtime (se disponível)

## 🎨 Personalização

### Alterar URL do Supabase

Edite `assets/js/supabase.js`:

```javascript
const SUPABASE_URL = 'https://SEU_PROJETO.supabase.co';
```

### Alterar Nome da Tabela

Edite `assets/js/supabase.js`:

```javascript
const TABLE_NAME = 'Seu Nome de Tabela';
```

### Cores e Tema

Edite `assets/css/styles.css` na seção `:root`:

```css
:root {
    --accent-primary: #667eea;
    --accent-secondary: #764ba2;
    /* ... */
}
```

## 🛠️ Tecnologias

- **HTML5**
- **CSS3** (Glassmorphism, Gradientes, Flexbox, Grid)
- **JavaScript ES6+** (Vanilla)
- **Bootstrap 5.3** (via CDN)
- **Chart.js 4** (via CDN)
- **Supabase JS v2** (via CDN)
- **Bootstrap Icons** (via CDN)

## 📊 Gráficos e KPIs

### KPIs

1. **Total de Ofertas**: Após aplicar filtros
2. **Última Atualização**: Timestamp da última busca
3. **Ofertas nas Últimas 24h**: Contagem de registros criados nas últimas 24h
4. **Pico por Hora (24h)**: Maior quantidade de ofertas em uma hora

### Gráficos

1. **Ofertas por Hora** (linha): Distribuição das últimas 24 horas
2. **Ofertas por Dia** (barras): Últimos 5 dias incluindo hoje
3. **Tipo de Cabine** (pizza): Distribuição por classe
4. **Programa de Emissão** (pizza): Distribuição por programa
5. **Top 5 Origens** (barras): Cidades mais comuns
6. **Top 5 Destinos** (barras): Destinos mais comuns
7. **Qualidade dos Dados** (barras): % de campos vazios

### Tabela

- **Últimas 10 Ofertas**: Lista as ofertas mais recentes com link clicável

## 🔒 Segurança

- **Não expõe service_role key** (apenas anon key pública)
- Chave armazenada apenas no localStorage do navegador
- Todas as consultas respeitam políticas RLS do Supabase
- Sem backend próprio - comunicação direta com Supabase

## 🐛 Troubleshooting

### Erro 401 ao conectar

**Problema**: Anon key inválida ou RLS bloqueando

**Solução**:
1. Verifique se copiou a anon key correta (não a service_role)
2. Confirme que criou a política RLS de leitura pública
3. Teste a query no SQL Editor do Supabase

### Realtime não funciona

**Problema**: Realtime não está ativado

**Solução**:
1. Vá em **Database** → **Replication**
2. Habilite replicação para a tabela "Rotas Encontradas"
3. O dashboard continua funcionando com polling automático

### Campos não aparecem

**Problema**: Nome das colunas diferente do esperado

**Solução**: O dashboard aceita variações automáticas, mas se ainda assim não funcionar, verifique em `utils.js` a função `extractFields` e adicione suas variações.

### Gráficos não renderizam

**Problema**: Dados nulos ou vazios

**Solução**:
1. Marque "Desconsiderar registros vazios"
2. Verifique se há dados com `created_at` válido
3. Abra o console do navegador (F12) para ver logs

## 📝 Notas Importantes

- O dashboard **não modifica** dados, apenas lê
- Filtros são aplicados no cliente (navegador)
- Para datasets muito grandes (>10k registros), considere adicionar paginação
- O nome da tabela tem espaço ("Rotas Encontradas") - o código já trata isso

## 📄 Licença

Projeto de código aberto para uso livre.

## 🤝 Contribuições

Sugestões e melhorias são bem-vindas!

---

**Desenvolvido com ❤️ para monitoramento de ofertas em milhas**
