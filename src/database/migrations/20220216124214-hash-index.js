module.exports = {
  up: async (queryInterface, Sequelize) =>
    queryInterface.createTable('HashIndex', {
      version: {
        type: Sequelize.INTEGER,
      },
      ipfsHash: {
        type: Sequelize.STRING,
        unique: true,
      },
      userId: {
        type: Sequelize.STRING,
        unique: true,
      },
      edited: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
    }),

  down: async (queryInterface) => queryInterface.dropTable('HashIndex'),
}
