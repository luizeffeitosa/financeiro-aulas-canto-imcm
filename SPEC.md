# Aulas de Canto IMCM — Especificação (v1)

Status: **rascunho para validação do protótipo** · Dono: Edu (Líder Geral do Louvor) · 10/11/2026

## 1. Problema
O ministério paga 100% das aulas de canto do professor João Liasch (NF mensal). Cada aluno reembolsa 50% (R$ 70). Todo mês o Edu confere quem pagou (comprovantes chegam pelo WhatsApp) e presta contas ao financeiro da igreja. Hoje isso vive numa planilha com uma aba por mês, sem visão de dívida acumulada.

## 2. Objetivo da v1
1. Ver mês a mês e no ano: quem pagou, quem não pagou, saldo do mês e do ano.
2. Marcar pagamentos à medida que os comprovantes chegam (celular).
3. Gerar o relatório mensal em PDF para o financeiro.

**Fora da v1:** integração com WhatsApp, envio de e-mail, exportação para planilha, multiusuário.

## 3. Regras de negócio
| # | Regra |
|---|---|
| R1 | **Competência.** Cada mensalidade pertence a um mês (competência). Pagamento atrasado quita a competência de origem e registra `pago_em` (data real do recebimento). |
| R2 | **Status** de uma mensalidade: `pendente` (padrão), `pago`, `isento`, `desabilitado` (fora da NF). |
| R3 | **Conta** é obrigatória quando `pago`: `PagSeguro` (conta correta), `Bradesco`, `PicPay`, `Outra`. Fora do PagSeguro é sinalizado no relatório. |
| R4 | **Isento** entra na NF do João, não paga reembolso; a igreja cobre 100%. Motivo opcional. Isenção é por mês. |
| R5 | **Parâmetros por mês:** valor da mensalidade (hoje R$ 140) e parcela do aluno (hoje R$ 70). Copiados do mês anterior ao abrir um mês novo. |
| R6 | **NF esperada** = nº de alunos no mês (inclui isentos) × mensalidade + Σ ajustes. |
| R7 | **Ajustes da NF** são lançamentos (valor ±, descrição, aluno opcional). Ex.: −140 "Luciana pagou 2x em maio". |
| R8 | **A receber dos alunos** = nº de não isentos × parcela do aluno. **Recebido** = Σ parcelas `pago` da competência. **Pendente** = A receber − Recebido. |
| R9 | **Parcela da igreja** = NF esperada − Recebido dos alunos. |
| R10 | **Saldo do mês** = Recebido − A receber (≤ 0). **Saldo do ano** = Σ saldos dos meses do ano. |
| R11 | **Débitos em aberto por pessoa** = Σ competências `pendente` no período filtrado: um mês, um ano (padrão: o ano selecionado) ou todos os anos. Um período não penaliza o outro. Pendências antigas migram como `pendente` e não há cobrança ativa; não existe status de "perdoado". |
| R12 | **Abrir mês**: cria uma mensalidade para cada aluno cadastrado (ver R17). Meses já abertos não mudam. |
| R14 | **Alerta na visão do mês:** cada aluno com competências anteriores `pendente` mostra quantos meses deve, o total e quais meses. É só informativo. |
| R15 | **Comprovante** (opcional para marcar pago): só imagem, comprimida no aparelho (≤1600px, JPEG). Guardado no Supabase Storage, bucket privado `comprovantes`, em `AAAA/MM/nome-do-aluno.jpg`. Ao anexar, o mesmo arquivo é ligado aos outros pagamentos do aluno com a mesma data e sem comprovante (um Pix para vários meses). |
| R16 | **Apelido e WhatsApp** no cadastro do aluno. O botão **Cobrar no WhatsApp** (linhas com o mês pendente e/ou o mês anterior pendente) abre o WhatsApp com a mensagem pronta usando o apelido (ou o primeiro nome); sem telefone, o WhatsApp pede o contato. |
| R17 | **Habilitar/desabilitar no mês:** todos os alunos cadastrados aparecem em cada mês. Status `desabilitado` = fora da NF e do reembolso (afastado ou saiu). Ao abrir um mês, vem desabilitado quem é inativo no cadastro ou estava desabilitado no mês anterior; os demais vêm pendentes. Desabilitar pede confirmação e não vale para quem já pagou. |
| R18 | **Enviar relatório:** gera o PDF no aparelho (páginas do relatório + comprovantes) e abre o compartilhamento para o WhatsApp com o texto "Oi, fulano! Tudo certo? Segue o relatório de <mês> referente às aulas de canto." (destinatário em `lib/fmt.js`, `FINANCEIRO`). No computador, baixa o PDF e abre o WhatsApp com o texto. "Visualizar relatório" só abre a página. |
| R13 | Valor da parcela é guardado na própria mensalidade (permite meia mensalidade, ex. jan/25). |

## 4. Relatório mensal (PDF)
Cabeçalho IMCM · Louvor · competência. Seções: (1) NF esperada, ajustes, NF final; (2) parcela alunos × parcela igreja; (3) pagantes com conta, destacando fora do PagSeguro; (4) não pagantes e valor pendente; (5) isentos e valor coberto pela igreja; (6) recebimentos no mês de competências anteriores; (7) comprovantes: lista de quem enviou e de quem está faltando. Ao final, uma página por comprovante anexado (nome, competências, conta, valor, data).

## 5. Acesso
Login por e-mail e senha (Supabase Auth); link mágico como alternativa ("esqueci a senha"). Senha definida em `/senha` com o usuário logado. Login com Google: próximo passo. Apenas e-mails cadastrados na tabela `admins`. RLS em todas as tabelas: só o admin lê/escreve.

## 6. Modelo de dados (Postgres/Supabase)
```
alunos        (id, nome, apelidos text[], apelido text, telefone text, turma int, ativo bool)
meses         (competencia date pk, valor_mensalidade numeric null, valor_aluno numeric)
mensalidades  (id, competencia fk, aluno_id fk, status, valor_aluno numeric,
               conta text null, pago_em date null, motivo text null,
               unique(competencia, aluno_id))
ajustes       (id, competencia fk, valor numeric, descricao text, aluno_id fk null)
```
Cálculos (R6–R11) numa view `resumo_mes`; o app só lê.

## 7. Arquitetura
Um único app **Next.js (App Router) na Vercel** + **Supabase** (`@supabase/ssr`). Server Actions para escrita, sem API própria. CSS simples, sem biblioteca de UI. PDF pela página `/relatorio/[mes]`: CSS de impressão para imprimir/salvar e jsPDF + html2canvas para gerar o arquivo e compartilhar no WhatsApp. Repositório `luizeffeitosa/financeiro-aulas-canto-imcm`, commits direto na `main`, deploy automático.

## 8. Migração
Script único lê o `.xlsx` original → normaliza → insere. Planilha vira arquivo morto (não é alterada). Regras: de-para de nomes (§9), célula vazia = `pendente`, `Picpay` → `PicPay`, mensalidade desconhecida antes de jun/25 (`null`, NF não exibida), 2 ajustes de 2026 migrados como lançamentos.

**Critério de aceite da migração:** para cada mês, Recebido e Pendente do app = valores da planilha (diferença conhecida: jan/25, ver §9).

## 9. Pontos em aberto
- Jan/25: quem pagou meia mensalidade (R$ 35)?
- Luciana Coutinho: saiu em mai/26?
- Mel e Silinha (ex-alunas): nome completo?

## 10. Critérios de aceite da v1
- [ ] Marcar pago (com conta e data) em ≤ 2 toques no celular.
- [ ] Painel anual mostra grade aluno × mês e dívida acumulada por pessoa.
- [ ] Relatório do mês com as 6 seções, salvável em PDF.
- [ ] Totais migrados batem com a planilha.
- [ ] Ninguém além do admin acessa os dados.
