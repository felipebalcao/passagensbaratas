#!/bin/bash
# Para o servidor HTTP local

echo "Parando servidor..."
pkill -f "python3 -m http.server 8000"
echo "Servidor parado!"
