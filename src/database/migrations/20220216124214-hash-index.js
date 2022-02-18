module.exports = {
  up: async (queryInterface, Sequelize) =>
    queryInterface.createTable('HashIndices', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        unique: true,
        primaryKey: true,
      },
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
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    }),

  down: async queryInterface => queryInterface.dropTable('HashIndices'),
}
