---
titulo: "Lakehouse sem dor de cabeça: Iceberg + DuckDB na prática"
subtitulo: "Por que sua arquitetura de dados ainda parece um Frankenstein e como consertar isso hoje"
edicao: "30"
data: "12/10/2026"
tempo_leitura: "4"
seo_titulo: "Arquitetura Lakehouse prática com Apache Iceberg e DuckDB | Decifrando Dados"
seo_descricao: "Como montar um Lakehouse funcional sem vender rim: Iceberg para tabelas, DuckDB para query local. Código real, zero vendor lock-in."
post_divulgacao: |
  Seu lakehouse parece mais um pântano? Você não está sozinho. A indústria vendeu "arquitetura moderna" e entregou complexidade de fábrica.

  Iceberg resolve ACID e time travel no Parquet. DuckDB roda SQL analítico no seu laptop mais rápido que seu warehouse na nuvem. Juntos, eles matam a necessidade de cluster para 80% dos casos.

  Qual parte da sua stack de dados você jogaria no lixo amanhã se pudesse?

  #dados #analytics #carreira #ia #sql
---

# Lakehouse sem dor de cabeça: Iceberg + DuckDB na prática
## Por que sua arquitetura de dados ainda parece um Frankenstein e como consertar isso hoje

Há 15 anos, o Hadoop prometia "democratizar big data". Entregou MapReduce, NameNode caindo todo domingo e uma geração de engenheiros com PTSD de Java. Hoje, vendem "lakehouse" como se fosse mágica. Spoiler: não é.

⚡ **O que você vai ver hoje:**
- 🧊 Iceberg: ACID real no Parquet sem precisar de PhD
- 🦆 DuckDB: seu warehouse pessoal que cabe no bolso
- 🔧 Como conectar os dois e parar de pagar compute ocioso

### CARREIRA & NEGÓCIOS: Pare de alugar cluster para fazer `SELECT *`
A Databricks fatura US$ 1,6 bi/ano vendendo compute gerenciado. A Snowflake, US$ 2,8 bi. O modelo é simples: você paga por segundos de CPU que mal usa. Um job de 15 minutos roda em cluster de 4 nós. Custo: US$ 12. No DuckDB local: US$ 0 e roda em 40 segundos.

> 💡 **O número do jogo:** 73% das queries analíticas processam menos de 10 GB de dados (fonte: MotherDuck benchmark 2024). Você não precisa de Spark para isso.

> 🎯 **Recado para a diretoria:** Se seu time de dados gasta 40% do tempo gerenciando infra e não modelando negócio, a arquitetura está errada. Não é "complexidade necessária". É dívida técnica com recibo.

### Don't Leave, Just Read
- ⚡ **Iceberg 1.5.0:** Suporte nativo a `MERGE` e `DELETE` por position delete files. Finalmente dá para fazer CDC decente sem reescrever a tabela inteira.
- 📦 **DuckDB 1.1:** Extensão `iceberg` estável. Lê tabelas Iceberg direto do S3/MinIO/GCS sem registrar catálogo. `SELECT * FROM iceberg_scan('s3://bucket/table')` e pronto.
- 🛡️ **Polars + Iceberg:** O `polars.read_iceberg()` agora faz predicate pushdown real. Seu script Python de 200 linhas vira 15.

### Decifrando na Prática: 3 passos para esta semana
1. **Suba um MinIO local:** `docker run -d -p 9000:9000 -p 9001:9001 minio/minio server /data --console-address ":9001"`. S3 compatível de graça no seu laptop.
2. **Crie sua primeira tabela Iceberg com DuckDB:**
   ```sql
   INSTALL iceberg; LOAD iceberg;
   CREATE TABLE iceberg_scan('s3://dados/vendas') AS
   SELECT * FROM read_parquet('vendas_2024.parquet');
   ```
3. **Teste time travel:** `SELECT * FROM iceberg_scan('s3://dados/vendas', snapshot_id => 12345)`. Viagem no tempo sem dor.

### A Redação Recomenda & Frase do Dia
- **Ferramenta da semana:** `lakefs/lakefs` — versionamento de dados estilo Git no seu object store. `lakectl commit -m "ajustei partição"` e sua vida muda.
- *"Seu lakehouse não precisa de Kubernetes. Precisa de alguém que saiba escrever SQL decente."*