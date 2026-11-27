#!/usr/bin/env bash
set -euo pipefail

# Avec bash -s (première mise à jour), partir du dépôt courant.
cd -- "$(dirname -- "${BASH_SOURCE[0]:-./deploy.sh}")"
cd -- "$(git rev-parse --show-toplevel)"
port=${PORT:-4000}
runtime=.lanalytics
mkdir -p "$runtime"
exec 9>"$runtime/deploy.lock"
flock -n 9 || { echo "Un déploiement est déjà en cours." >&2; exit 1; }

case "${1:-}" in
    "") ;;
    --update)
        git fetch origin
        target=$(git rev-parse '@{upstream}')
        git merge-base --is-ancestor HEAD "$target" || { echo "Mise à jour non fast-forward." >&2; exit 1; }
        if git cat-file -e "$target:database.sqlite" 2>/dev/null; then
            echo "La branche distante suit encore database.sqlite." >&2
            exit 1
        fi
        ;;
    *) echo "Usage : bash deploy.sh [--update]" >&2; exit 1 ;;
esac

for cmd in node curl lsof; do command -v "$cmd" >/dev/null; done
listeners() { lsof -nP -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null | sort -u; }
pid=$(listeners || true)
if [[ -n "$pid" ]]; then
    # Reconnaît aussi le serveur lancé par l'ancien script (exec -a lanalytics).
    if [[ "$pid" == *$'\n'* || "$(readlink "/proc/$pid/cwd")" != "$PWD" ||
          "$(basename -- "$(readlink "/proc/$pid/exe")")" != node ]]; then
        echo "Port $port occupé par un autre service." >&2; exit 1
    fi
    mapfile -d '' -t args < "/proc/$pid/cmdline"
    if [[ "${args[1]:-}" != index.js && "${args[1]:-}" != "$PWD/index.js" ]]; then
        echo "Processus inconnu sur le port $port." >&2; exit 1
    fi
    kill -TERM "$pid"
    for ((i=0; i<50; i++)); do
        kill -0 "$pid" 2>/dev/null || break
        sleep 0.1
    done
    if [[ -n "$(listeners || true)" ]]; then echo "Port $port toujours occupé." >&2; exit 1; fi
fi

if [[ "${1:-}" == --update ]]; then
    restore_db=false
    if [[ -f database.sqlite ]]; then
        backup_dir="../$(basename "$PWD")-backups"
        mkdir -p -m 700 -- "$backup_dir"
        backup=$(mktemp "$backup_dir/database-XXXXXXXX.sqlite")
        cp -- database.sqlite "$backup"
        echo "Sauvegarde : $backup"
    fi
    if git ls-files --error-unmatch database.sqlite >/dev/null 2>&1; then
        if [[ ! -f database.sqlite ]]; then
            echo "Base suivie absente : restaure la sauvegarde avant de continuer." >&2; exit 1
        fi
        if ! git diff --cached --quiet -- database.sqlite; then
            echo "La base contient une modification indexée. Retire-la de l'index avec git restore --staged database.sqlite avant de réessayer." >&2; exit 1
        fi
        # Le prochain commit retire la base du suivi. La restaurer même si Git échoue.
        restore_db=true
        trap 'cp -- "$backup" database.sqlite' EXIT
        git restore --worktree -- database.sqlite
    fi
    git merge --ff-only "$target"
    if [[ "$restore_db" == true ]]; then
        cp -- "$backup" database.sqlite
        trap - EXIT
    fi
fi

log="$runtime/server.log"
PORT="$port" nohup node index.js </dev/null >>"$log" 2>&1 9>&- &
pid=$!
for ((i=0; i<50; i++)); do
    kill -0 "$pid" 2>/dev/null || break
    if [[ "$(listeners || true)" == "$pid" ]] && curl -fsS --noproxy '*' --max-time 1 "http://localhost:$port/" >/dev/null 2>&1; then
        echo "LAnalytics répond sur le port $port (PID $pid)."
        exit 0
    fi
    sleep 0.2
done
kill -TERM "$pid" 2>/dev/null || true
echo "Échec du démarrage. Consulte $log." >&2
exit 1
