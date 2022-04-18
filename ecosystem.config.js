module.exports = {
  apps:  [
    {
      name: 'ep-api',
      script: 'yarn dev',
      watch: true,
      ignore_watch: ["[\/\\]\./", "uploads"],
    },
    {
      name: 'indexer-service',
      script: 'yarn console:dev indexer -l true',
      args: 'indexer',
      watch: true,
      ignore_watch: ["[\/\\]\./", "uploads"],
      watch_delay: 1000,
      restart_delay: 900000,
      max_memory_restart: '400M',
    }
  ]
}