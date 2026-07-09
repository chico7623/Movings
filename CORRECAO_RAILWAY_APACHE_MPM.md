# Correção Railway — Apache MPM

Esta versão já inclui a correção para o erro:

```text
AH00534: apache2: Configuration error: More than one MPM loaded.
```

## Ficheiro corrigido

```text
backend/Dockerfile
```

O Apache foi configurado para usar apenas `mpm_prefork`, desligando `mpm_event` e `mpm_worker`.

## Comandos recomendados depois de extrair

```powershell
cd "CAMINHO_DA_PASTA_EXTRAIDA"

git remote set-url origin https://github.com/chico7623/Movings.git
git add --renormalize .
git add .
git commit -m "Fix Apache MPM configuration for Railway backend"
git push
```

Depois, no Railway, faz redeploy do serviço backend e testa:

```text
https://movings-production.up.railway.app/health.php
```
