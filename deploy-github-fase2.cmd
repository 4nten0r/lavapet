@echo off
cd /d "%~dp0"
(echo === HISTORICO ENVIADO) > deploy-log2.txt 2>&1
git log --oneline -5 >> deploy-log2.txt 2>&1
(echo === FICHEIROS DO COMMIT ANTERIOR) >> deploy-log2.txt 2>&1
git show --name-only --oneline HEAD~1 >> deploy-log2.txt 2>&1
(echo === RETIRAR DOCE-AFETO-API-MAIN) >> deploy-log2.txt 2>&1
git rm -r --cached doce-afeto-api-main >> deploy-log2.txt 2>&1
(echo === ADD) >> deploy-log2.txt 2>&1
git add -A >> deploy-log2.txt 2>&1
(echo === STATUS ANTES DO COMMIT) >> deploy-log2.txt 2>&1
git status --short >> deploy-log2.txt 2>&1
(echo === COMMIT) >> deploy-log2.txt 2>&1
git commit -m "Retirar doce-afeto-api-main do repositorio" >> deploy-log2.txt 2>&1
(echo === PUSH) >> deploy-log2.txt 2>&1
git push origin main >> deploy-log2.txt 2>&1
(echo === FINAL) >> deploy-log2.txt 2>&1
echo TERMINADO >> deploy-log2.txt
