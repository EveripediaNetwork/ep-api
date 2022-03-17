// TODO: get from .envs
export default {
  graphUrl: 'https://api.thegraph.com/subgraphs/name/kesar/wiki-mumbai-v1',
  ipfsUrl: 'https://ipfs.io/ipfs/',
  // ipfsUrl: 'https://gateway.pinata.cloud/ipfs/',
  dbUser: 'postgres',
  dbHost: 'localhost',
  dbPassword: 'HUNTER',
  dbName: 'graph-node',
  port: process.env.PORT || 5000,
  ApiKey: 'd114ba1a1e885252637f',
  ApiSecret: '6a07b0d42b41c60d0a68da7faa6c590dfde1e2195f64d14755e4f3fdd97d0b97',
}
