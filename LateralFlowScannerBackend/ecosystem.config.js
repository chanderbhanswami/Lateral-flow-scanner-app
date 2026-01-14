```javascript
module.exports = {
  apps: [{
    name: 'lateral-flow-backend',
    script: './dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    max_memory_restart: '1G'
  }]
};
```