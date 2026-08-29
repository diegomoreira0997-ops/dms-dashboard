# DMS Dashboard — Painel de Gestão de Carga Horária Docente

Ferramenta web para gestão de carga horária (CH) e folha docente de instituições de ensino superior. Construída do zero, 100% front-end (HTML + CSS + JavaScript puro, sem frameworks), rodando inteiramente no navegador — nenhum dado é enviado a servidor algum.

## Estrutura do projeto

```
dms-dashboard-project/
├── index.html                              # estrutura da página
├── css/
│   └── style.css                           # todo o estilo do painel
├── js/
│   └── app.js                              # toda a lógica (parsing, cálculos, gráficos, exportação)
├── dados-exemplo/
│   └── planilha-modelo-portfolio.xlsx      # planilha fictícia para testar o painel
└── README.md
```

Para rodar localmente, basta abrir o `index.html` no navegador (não precisa de servidor nem instalação) e carregar a planilha de `dados-exemplo/`.

## O que a ferramenta faz

- Calcula CH e custo de folha docente (Base + DSR + Horas de Atividade) a partir de uma planilha `.xlsx`
- Três visões: **Executivo** (resumo para gestão), **Operacional** (análise detalhada, gráficos, heatmap professor×curso) e **Orçamento** (Orçado vs Realizado, em R$ e em CH)
- Alertas automáticos de professores acima do limite legal de carga horária
- Geração em lote de Termos Aditivos de carga horária (cruzando com CPF)
- Exportação em PDF, Excel e CSV

## Stack

HTML5, CSS3, JavaScript (vanilla) · [Chart.js](https://www.chartjs.org/) para gráficos · [SheetJS](https://sheetjs.com/) para leitura de planilhas · jsPDF + html2canvas para exportação em PDF

## Sobre os dados de exemplo

⚠️ **Os dados usados para demonstração (`dados-exemplo/planilha-modelo-portfolio.xlsx`) são 100% fictícios.**

Nomes de professores, CPFs, cursos, valores de orçamento e carga horária foram gerados aleatoriamente apenas para fins de demonstração da ferramenta. Não representam nenhuma instituição, pessoa ou CPF reais — os CPFs, inclusive, não possuem dígito verificador válido, sendo apenas sequências numéricas de exemplo.

A ferramenta foi originalmente desenvolvida durante minha atuação em uma instituição de ensino real, mas essa versão de portfólio foi completamente descaracterizada: sem nome, logo, CNPJ ou qualquer dado que identifique a instituição de origem.

## Desenvolvimento

Projeto desenvolvido por iniciativa própria, com apoio de IA (Claude, Anthropic) para arquitetura, implementação e revisão de código — decisões de regras de negócio e requisitos definidos por mim.
