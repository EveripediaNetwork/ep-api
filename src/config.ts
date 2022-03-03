// TODO: get from .envs
export default {
  graphUrl: 'https://api.thegraph.com/subgraphs/name/kesar/wiki-mumbai-v1',
  ipfsUrl: 'https://ipfs.io/ipfs/',
  // ipfsUrl: 'https://gateway.pinata.cloud/ipfs/',
  dbUser: 'root',
  dbHost: 'localhost',
  dbPassword: 'root',
  dbName: 'ep',
  port: process.env.PORT || 5000,
}
