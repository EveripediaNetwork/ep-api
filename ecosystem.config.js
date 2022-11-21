module.exports = {
  apps:  [
    {
      name: 'ep-api',
      script: 'dist/src/main.js',
      watch: false,
      time: true,
      instances : "max",
      exec_mode : "cluster",
      ignore_watch: ["[\/\\]\./", "uploads"],
      restart_delay: 10000,
      watch_delay: 10000,
      max_memory_restart: '2600M',
    },
    {
      name: 'indexer-service',
      script: 'yarn console indexer -l true',
      args: 'indexer',
      watch: false,
      time: true,
      ignore_watch: ["[\/\\]\./", "uploads"],
      watch_delay: 10000,
      exp_backoff_restart_delay: 1000,
      max_memory_restart: '600M',
    },
    {
      name: 'notification-service',
      script: 'yarn console-mail notifications -l true',
      args: 'notifications',
      watch: false,
      time: true,
      ignore_watch: ["[\/\\]\./", "uploads"],
      watch_delay: 10000,
      exp_backoff_restart_delay: 1000,
      max_memory_restart: '600M',
    }
  ]
}
