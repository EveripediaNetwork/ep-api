module.exports = {
  apps: [{
    name: 'Indexer Service',
    script: 'yarn console:dev indexer',
    args: 'indexer',
    watch: true,
    watch_delay: 1000,
    restart_delay: 900000,
    max_memory_restart: '300M'
  }]
}