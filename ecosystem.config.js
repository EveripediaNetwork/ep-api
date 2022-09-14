module.exports = {
  apps:  [
    {
      name: 'ep-api',
      script: 'dist/src/main.js',
      watch: false,
      instances : "max",
      exec_mode : "cluster",
      ignore_watch: ["[\/\\]\./", "uploads"],
      restart_delay: 10000,
      watch_delay: 10000,
      max_memory_restart: '600M',
    },
    {
      name: 'indexer-service',
      script: 'yarn console indexer -l true',
      args: 'indexer',
      watch: false,
      ignore_watch: ["[\/\\]\./", "uploads"],
      watch_delay: 10000,
      restart_delay: 900000,
      max_memory_restart: '400M',
    }
  ]
}
