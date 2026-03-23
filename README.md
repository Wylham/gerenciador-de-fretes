# Dashboard de Fretes Diários

Projeto full-stack com `React + Vite` no frontend e `Node.js + Express + MongoDB Atlas` no backend. A aplicação trabalha por dia (`YYYY-MM-DD`), faz CRUD completo dos fretes, aplica polling leve para múltiplos dispositivos e exporta PDF do dia no navegador.

## Estrutura

```text
apps/
  api/  -> Express + Mongoose
  web/  -> React + Vite
```

## Requisitos

- Node.js 20+
- npm 10+
- MongoDB Atlas free com uma string de conexão válida

## Configuração

1. Instale as dependências na raiz:

```bash
npm install
```

2. Configure os arquivos de ambiente:

```bash
copy apps\api\.env.example apps\api\.env
copy apps\web\.env.example apps\web\.env
```

3. Edite os valores:

- `apps/api/.env`
  - `PORT=3001`
  - `MONGODB_URI=...`
  - `CORS_ORIGIN=http://localhost:5173`
- `apps/web/.env`
  - `VITE_API_BASE_URL=http://localhost:3001/api`

## Rodando em desenvolvimento

Em dois terminais separados:

### API

```bash
npm run dev:api
```

Ou, dentro de `apps/api`:

```bash
npm run dev
```

### Web

```bash
npm run dev:web
```

Ou, dentro de `apps/web`:

```bash
npm run dev
```

Frontend em `http://localhost:5173` e API em `http://localhost:3001`.

## Build

```bash
npm run build --workspace @fretes/api
npm run build --workspace @fretes/web
```

## Funcionalidades

- Topbar sticky com status de conexão, teste de `/api/health`, recarregar e exportar PDF.
- CRUD completo de fretes por data.
- Busca por `placa`, `cliente`, `loteMotz`, `loteAtua` e `taggy`.
- Taggy clicável na tabela para aplicar filtro.
- `Limpar dia` com confirmação, removendo todos os registros da data selecionada.
- Polling simples para multi-dispositivo.
- Exportação de PDF no browser respeitando o filtro atual.

## Polling

O frontend refaz o GET do dia automaticamente a cada 7 segundos e também recarrega após criar, editar, excluir ou limpar o dia.

Para ajustar o intervalo:

- Arquivo: `apps/web/src/constants.ts`
- Constante: `POLLING_INTERVAL_MS`

## Limpar dia

O botão `Limpar dia` usa a data atualmente selecionada e chama:

```http
DELETE /api/freights/by-date?date=YYYY-MM-DD
```

Antes de apagar, a UI pede confirmação.

## PDF

O PDF é gerado no frontend com `jsPDF + autoTable`.

- Respeita o filtro atual da busca.
- Respeita o filtro por Taggy clicável.
- Inclui data do relatório, data/hora de geração, total de registros e soma dos valores.

## Endpoints

Base URL: `/api`

- `GET /api/health`
- `GET /api/freights?date=YYYY-MM-DD`
- `POST /api/freights`
- `PUT /api/freights/:id`
- `DELETE /api/freights/:id`
- `DELETE /api/freights/by-date?date=YYYY-MM-DD`

## Observações

- Não há autenticação, por definição do escopo.
- O backend valida e normaliza placa, data, enums e `freightCents`.
- O frontend aceita dinheiro em formato brasileiro, como `1500,00`, e salva em centavos.
- Nenhuma credencial real foi incluída no repositório.
