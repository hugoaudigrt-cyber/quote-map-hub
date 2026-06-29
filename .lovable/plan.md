# Reestruturação Fornecedores / Produtos / Preços

## 1. Diagnóstico da arquitetura atual

Tabelas relevantes hoje:

- `produtos` — catálogo por empresa (`codigo`, `descricao`, `categoria`, `unidade`, `observacoes`). **Já não armazena preço** — bom ponto de partida.
- `fornecedores` — cadastro por empresa, sem qualquer vínculo com produtos.
- `solicitacoes` / `solicitacao_itens` — pedido de compra com produtos + quantidades (sem fornecedor).
- `mapas_cotacao` / `mapa_itens` / `mapa_precos` — comparativo: cada item recebe um preço por fornecedor **dentro daquela cotação**.

Problemas encontrados:

1. **Não existe vínculo Fornecedor × Produto.** Hoje qualquer fornecedor pode ser usado para qualquer produto no mapa de cotação — não há "produtos fornecidos por X".
2. **Não existe histórico de preços do fornecedor.** O único preço gravado é o da cotação (`mapa_precos`), perdido fora do contexto daquele mapa. Não há "último preço" recuperável.
3. **`produtos` não tem `fabricante`** (campo pedido pelo requisito).
4. **UI do fornecedor** não tem aba de produtos fornecidos.
5. **Mapa de cotação** lista preços vazios para qualquer fornecedor selecionado — não filtra por produtos efetivamente vendidos.
6. **Bug "Empresa não encontrada"**: a causa raiz já foi tratada na rodada anterior (RPC `ensure_usuario_empresa_for_user` + hook `useEnsureEmpresa` chamado antes de cada `insert`). Vou auditar os módulos novos para garantir o mesmo padrão e não reintroduzir o sintoma.

## 2. Proposta de solução

Reaproveitar tudo o que já existe. Apenas:

- adicionar `fabricante` em `produtos`;
- criar **2 tabelas novas** para o relacionamento e o histórico;
- não tocar em `solicitacoes`, `mapa_itens`, `mapa_precos` (continuam funcionando);
- ajustar o mapa de cotação para **filtrar produtos pelo fornecedor** e **pré-preencher** o preço com o último vigente (sem alterar histórico ao editar dentro do mapa — `mapa_precos` já isola isso).

### 2.1 Tabelas novas

```text
fornecedor_produtos                 (vínculo N:N ativo)
├── id (uuid pk)
├── empresa_id (uuid, fk empresas)  -- redundante p/ RLS rápido
├── fornecedor_id (uuid, fk)
├── produto_id (uuid, fk)
├── created_at / updated_at / deleted_at
└── UNIQUE(fornecedor_id, produto_id) WHERE deleted_at IS NULL

fornecedor_produto_precos           (histórico append-only)
├── id (uuid pk)
├── fornecedor_produto_id (uuid, fk)
├── preco (numeric NOT NULL)
├── data_vigencia (date NOT NULL, default today)
├── observacoes (text)
├── created_by (uuid)
└── created_at
```

Regras:

- Preço é sempre `INSERT`. Nunca `UPDATE`/`DELETE` (RLS bloqueia update/delete).
- "Último preço" = `ORDER BY data_vigencia DESC, created_at DESC LIMIT 1`.
- Remover vínculo = `UPDATE deleted_at` em `fornecedor_produtos` (preserva histórico).

### 2.2 Tabelas alteradas

- `produtos`: adicionar coluna `fabricante text NULL`.

### 2.3 RLS

Mesmo padrão dos demais módulos: políticas baseadas em `current_empresa_id()`; `fornecedor_produto_precos` herda empresa via join com `fornecedor_produtos`. `INSERT` e `SELECT` liberados; `UPDATE`/`DELETE` negados em preços.

### 2.4 Fluxo de UI

**Cadastro do fornecedor** vira diálogo com 2 abas:

- *Dados* — formulário atual, inalterado.
- *Produtos Fornecidos* — tabela (Produto · Categoria · Unidade · Último preço · Atualizado em · Ações) + botão **+ Adicionar Produto**.

**Diálogo "Adicionar Produto ao Fornecedor"**:

1. Combobox de busca de produto existente (descricao/codigo).
2. Botão "Cadastrar novo produto" abre sub-form inline (descricao, categoria, unidade, fabricante).
3. Campos sempre visíveis: **Preço atual**, **Data de vigência** (default hoje), **Observações**.
4. Ao salvar, em transação:
   - cria produto (se novo) → `produtos.insert`;
   - cria vínculo → `fornecedor_produtos.insert` (ou reativa se soft-deleted);
   - cria preço inicial → `fornecedor_produto_precos.insert`.

**Ações na lista**:

- *Editar preço* → diálogo simples (preço + data + obs) → **novo INSERT** em `fornecedor_produto_precos`.
- *Ver histórico* → diálogo com lista cronológica.
- *Remover vínculo* → soft delete em `fornecedor_produtos`.

**Mapa de cotação** (`mapas.tsx`):

- Ao escolher fornecedor para uma coluna, ao montar itens já existentes do mapa, buscar em `fornecedor_produto_precos` o último preço por `(fornecedor, produto)` e pré-preencher `mapa_precos.preco`.
- O usuário pode sobrescrever — fica salvo apenas em `mapa_precos` (histórico do fornecedor permanece intacto).
- Produtos não vinculados ao fornecedor: exibir campo vazio + ícone informando "produto não cadastrado para este fornecedor" (não bloqueia — o usuário pode digitar mesmo assim para não travar o fluxo já existente).

## 3. Arquivos / migrações

**Migração SQL:**

- `ALTER TABLE produtos ADD COLUMN fabricante text`.
- `CREATE TABLE fornecedor_produtos` + GRANTs + RLS + índice único parcial.
- `CREATE TABLE fornecedor_produto_precos` + GRANTs + RLS (sem update/delete).
- View opcional `fornecedor_produtos_ultimo_preco` para simplificar a leitura.

**Frontend:**

- `src/routes/_authenticated/fornecedores.tsx` — diálogo com tabs + ações de produtos.
- `src/components/fornecedor-produtos-tab.tsx` (novo) — tabela + adicionar/editar/histórico.
- `src/routes/_authenticated/produtos.tsx` — adicionar campo `fabricante`.
- `src/routes/_authenticated/mapas.tsx` — auto-preencher últimos preços por fornecedor.

## 4. Funcionalidades preservadas

CRUD de obras, produtos, fornecedores, solicitações, mapas, histórico e usuários permanecem intactos. `mapa_precos` continua sendo a fonte de verdade do preço **dentro** de uma cotação.

## 5. Riscos

- Produtos antigos sem vínculo a fornecedor: o filtro novo no mapa **não bloqueia**, apenas sinaliza — evita quebrar mapas já em andamento.
- Concorrência em "último preço": resolvida por `ORDER BY data_vigencia DESC, created_at DESC`.

Aprovando, eu aplico migração + UI numa única rodada.