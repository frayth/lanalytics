#!/bin/bash

# Aller dans le dossier du projet
cd ~/projets/lanalytics

echo "Déploiement de lanalytics..."

# Supprimer un éventuel fichier logs et créer le dossier
if [ -e logs ] && [ ! -d logs ]; then
    rm logs
fi

mkdir -p logs

# Arrêter le processus utilisant le port 4000
PID=$(lsof -t -i:4000)

if [ -n "$PID" ]; then
    echo "Arrêt du processus sur le port 4000 (PID: $PID)"
    kill $PID
    sleep 2
else
    echo "Aucun processus trouvé sur le port 4000"
fi

# Lancer le serveur Node en arrière-plan avec le nom lanalytics
echo "Lancement du serveur lanalytics..."

nohup bash -c 'exec -a lanalytics node index.js' > logs/server.log 2>&1 &

echo "Serveur lancé avec le PID : $!"
echo "Logs disponibles dans : logs/server.log"
