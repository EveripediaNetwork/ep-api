module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Wikis', {
      wId: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      id: {
        type: Sequelize.STRING,
      },
      language: Sequelize.STRING,
      version: Sequelize.INTEGER,
      lastUpdate: Sequelize.STRING,
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('Wikis')
  },
}
