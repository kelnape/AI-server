#!/bin/bash

Název tmux relace

SESSION="kelnape"

Cesta k vašemu projektu (upravte, pokud se liší)

PROJECT_DIR=~/moje_prostredi

Zkontrolujeme, zda relace již neexistuje

tmux has-session -t $SESSION 2>/dev/null

if [ $? != 0 ]; then
echo "🚀 Startuji KELNAPE Tým v tmuxu..."

Vytvoříme novou relaci a první okno pro BACKEND

tmux new-session -d -s $SESSION -n "backend"

Příkazy pro Backend

tmux send-keys -t $SESSION:backend "cd $PROJECT_DIR" C-m
tmux send-keys -t $SESSION:backend "source bin/activate" C-m
tmux send-keys -t $SESSION:backend "python main.py" C-m

Vytvoříme druhé okno pro FRONTEND

tmux new-window -t $SESSION -n "frontend"

Příkazy pro Frontend

tmux send-keys -t $SESSION:frontend "cd $PROJECT_DIR/frontend" C-m
tmux send-keys -t $SESSION:frontend "npm run dev" C-m

Vrátíme se na okno s backendem jako výchozí

tmux select-window -t $SESSION:backend

echo "✅ Systém nastartován."
else
echo "⚠️ Systém už běží v relaci '$SESSION'."
fi

Připojíme se k relaci

tmux attach-session -t $SESSION
