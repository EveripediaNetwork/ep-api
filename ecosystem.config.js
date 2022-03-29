module.exports = {
  apps:  [
    {
      name: 'ep-api',
      script: 'yarn dev',
      watch: true,
    },
    {
      name: 'indexer-service',
      script: 'yarn console:dev indexer -l true',
      args: 'indexer',
      watch: true,
      watch_delay: 1000,
      restart_delay: 900000,
      max_memory_restart: '300M'
    }
  ]
}