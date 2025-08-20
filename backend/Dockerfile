# Dockerfile para o backend Python Flask + Redis
FROM python:3.12-slim

# (Opcional) Se precisar do redis-cli para debug dentro do container, instale redis-tools.
# RUN apt-get update && apt-get install -y --no-install-recommends redis-tools && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py ./

# Exponha a porta padrão do Flask
EXPOSE 5000

# Inicia apenas o Flask; conecta ao serviço Redis externo (nome do serviço: "redis").
CMD ["python", "app.py"]
