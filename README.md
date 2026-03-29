# FinVault

Dashboard financeiro desenvolvido para visualização de carteira, desempenho de ativos e indicadores de mercado.

## Sobre o projeto

O FinVault é uma aplicação web com foco em visualização de dados financeiros. O projeto combina um backend em Flask com endpoints mockados e uma interface em HTML, CSS e JavaScript para exibir métricas da carteira, gráfico de preço, alocação de ativos, principais movimentos do dia, índices de mercado e histórico de transações.

> Observação: este projeto utiliza dados simulados para fins de demonstração e portfólio.

## Funcionalidades

- Visão geral da carteira com KPIs principais
- Gráfico de preço por ativo
- Gráfico de alocação da carteira
- Lista de maiores movimentos do dia
- Histórico recente de transações
- Barra com índices de mercado
- Tabela de posições da carteira
- Fallback para dados demo quando o backend estiver offline

## Tecnologias utilizadas

- Python
- Flask
- Flask-CORS
- HTML5
- CSS3
- JavaScript
- Chart.js

## Estrutura do projeto

```bash
Dashboard/
├─ app.py
├─ index.html
├─ README.md
├─ css/
│  └─ style.css
├─ js/
│  └─ main.js
└─ .venv/