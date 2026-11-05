module.exports = {
  apps: [
    {
      name: 'discfinanci-api',
      cwd: './backend',
      script: './venv/bin/uvicorn',
      args: 'app.main:app --host 127.0.0.1 --port 8001',
      interpreter: 'none',
      restart_delay: 3000,
      max_memory_restart: '350M',
      env: {
        PYTHONPATH: '.'
      }
    },
    {
      name: 'discfinanci-web',
      cwd: './frontend',
      script: 'prod_server.js',
      restart_delay: 2000,
      max_memory_restart: '200M',
      env: {
        PORT: 3001,
        HOST: '0.0.0.0',
        BACKEND_URL: 'http://127.0.0.1:8001'
      }
    }
  ]
};

